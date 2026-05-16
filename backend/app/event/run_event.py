import json, re, shutil, subprocess, queue
from pathlib import Path

from flask_socketio import emit
from flask import request
from jdm_electron_flask import JDMEvent, get_socketio
from app.core.plugin_service import PluginService, _npm_global_root
import sys

kwargs = {}
if sys.platform == "win32":
    kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW

_ANSI_RE = re.compile(
    r'\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|\[[0-9;]*t|[()][0-9A-Za-z]|[^[\]()#;])'
)
_CTRL_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')

PROMPT_PREFIX = "__PROMPT__:"

def _strip(text: str) -> str:
    text = _ANSI_RE.sub("", text)
    text = _CTRL_RE.sub("", text)
    return text.strip()

_SHIM = Path(__file__).parent / "shim/plugin_runner.mjs"
_prompt_queues: dict[str, queue.Queue] = {}
_tab_sids: dict[str, str] = {}
_pending_prompts: dict[str, str] = {}
_tab_logs: dict[str, list] = {}
_tab_completed: dict[str, dict] = {}


def _find_node() -> str:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js not found in PATH.")
    return node


def _get_plugin_entry(namespace: str) -> Path:
    entry = PluginService.get_plugin(namespace)
    if not entry:
        raise RuntimeError(f"Plugin '{namespace}' is not installed.")
    pkg_name  = entry["package"]
    is_linked = entry.get("linked", False)
    local     = entry.get("localPath")
    pkg_root  = Path(local) if (is_linked and local) else Path(_npm_global_root()) / pkg_name
    pkg_json  = pkg_root / "package.json"
    if not pkg_json.exists():
        raise RuntimeError(f"package.json not found for '{pkg_name}' at '{pkg_root}'.")
    meta      = json.loads(pkg_json.read_text("utf-8"))
    main      = meta.get("main", "./lib/index.js").lstrip("./")
    entry_abs = pkg_root / main
    if not entry_abs.exists():
        raise RuntimeError(f"Plugin entry '{main}' not found inside '{pkg_root}'.")
    return entry_abs


def _build_cli_args(node: str, entry: Path, command: str, args: dict) -> list[str]:
    parts = [node, str(_SHIM), str(entry), command]
    for key, value in args.items():
        str_val = str(value)
        if str_val.lower() == "true":
            parts.append(f"--{key}")
        elif str_val.lower() not in ("false", ""):
            parts.extend([f"--{key}", str_val])
    return parts


class RunEvent(JDMEvent):

    def on_run_command(self, data):
        socketio  = get_socketio()
        sid       = request.sid

        tab_id    = data.get("tab_id", "")
        namespace = data.get("namespace", "")
        command   = data.get("command", "")
        args      = data.get("args", {})
        cwd       = data.get("cwd") or None

        try:
            node       = _find_node()
            entry_path = _get_plugin_entry(namespace)
            cli_args   = _build_cli_args(node, entry_path, command, args)
        except RuntimeError as exc:
            emit("run_error", {"tab_id": tab_id, "text": str(exc)})
            return

        q = queue.Queue()
        _prompt_queues[tab_id] = q
        _tab_sids[tab_id] = sid
        _tab_logs[tab_id] = []

        # Clear any previous completed state for this tab on new run
        _tab_completed.pop(tab_id, None)

        def _run():
            try:
                proc = subprocess.Popen(
                    cli_args,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    stdin=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    encoding="utf-8",
                    errors="replace",
                    cwd=cwd,
                    **kwargs,
                )

                for raw in proc.stdout:
                    line = _strip(raw)
                    if not line:
                        continue

                    current_sid = _tab_sids.get(tab_id, sid)

                    if line.startswith(PROMPT_PREFIX):
                        question = line[len(PROMPT_PREFIX):]
                        _pending_prompts[tab_id] = question
                        socketio.emit("run_prompt", {"tab_id": tab_id, "text": question}, to=current_sid)

                        try:
                            answer = q.get(timeout=300)
                        except queue.Empty:
                            answer = ""

                        _pending_prompts.pop(tab_id, None)
                        _tab_logs[tab_id].append({"type": "prompt", "text": question})
                        _tab_logs[tab_id].append({"type": "answer", "text": answer})

                        try:
                            proc.stdin.write(answer + "\n")
                            proc.stdin.flush()
                        except OSError:
                            pass
                        continue

                    _tab_logs[tab_id].append({"type": "line", "text": line})
                    socketio.emit("run_line", {"tab_id": tab_id, "text": line}, to=current_sid)

                try:
                    proc.stdin.close()
                except OSError:
                    pass

                proc.wait()

                # Save completed state BEFORE finally cleans up _tab_logs
                _tab_completed[tab_id] = {
                    "lines": list(_tab_logs.get(tab_id, [])),
                    "code": proc.returncode,
                    "success": proc.returncode == 0,
                }

                current_sid = _tab_sids.get(tab_id, sid)
                socketio.emit(
                    "run_done",
                    {"tab_id": tab_id, "code": proc.returncode, "success": proc.returncode == 0},
                    to=current_sid,
                )

            except Exception as exc:
                # Save completed state on error too
                _tab_completed[tab_id] = {
                    "lines": list(_tab_logs.get(tab_id, [])),
                    "code": 1,
                    "success": False,
                }
                current_sid = _tab_sids.get(tab_id, sid)
                socketio.emit("run_error", {"tab_id": tab_id, "text": str(exc)}, to=current_sid)
            finally:
                _prompt_queues.pop(tab_id, None)
                _tab_sids.pop(tab_id, None)
                _pending_prompts.pop(tab_id, None)
                _tab_logs.pop(tab_id, None)
                # _tab_completed intentionally NOT cleaned here — survives until client acks

        socketio.start_background_task(_run)

    def on_run_answer(self, data):
        tab_id = data.get("tab_id", "")
        answer = data.get("answer", "")

        # Update sid in case this comes from a reconnected client
        _tab_sids[tab_id] = request.sid

        q = _prompt_queues.get(tab_id)
        if q:
            q.put(answer)

    def on_run_clear(self, data):
        """Client cleared the terminal or started a new run — discard completed log cache."""
        tab_id = data.get("tab_id", "")
        _tab_completed.pop(tab_id, None)

    def on_reconnect_tabs(self, data):
        """
        Client sends this on mount with all tab_ids it knows about.
        - Still running  → replay buffer + resume + re-emit pending prompt if any
        - Finished while away → replay completed lines + re-emit run_done or run_error
        """
        socketio = get_socketio()
        sid      = request.sid
        tab_ids  = data.get("tab_ids", [])

        for tab_id in tab_ids:

            if tab_id in _prompt_queues:
                # ── Still running ─────────────────────────────
                _tab_sids[tab_id] = sid

                buffered = _tab_logs.get(tab_id, [])
                if buffered:
                    socketio.emit("run_replay", {
                        "tab_id": tab_id,
                        "lines": buffered,
                    }, to=sid)

                socketio.emit("run_resume", {"tab_id": tab_id}, to=sid)

                if tab_id in _pending_prompts:
                    socketio.emit("run_prompt", {
                        "tab_id": tab_id,
                        "text": _pending_prompts[tab_id],
                    }, to=sid)

            elif tab_id in _tab_completed:
                # ── Finished while client was away ────────────
                completed = _tab_completed[tab_id]

                if completed["lines"]:
                    socketio.emit("run_replay", {
                        "tab_id": tab_id,
                        "lines": completed["lines"],
                    }, to=sid)

                if completed["success"]:
                    socketio.emit("run_done", {
                        "tab_id": tab_id,
                        "code": completed["code"],
                        "success": True,
                    }, to=sid)
                else:
                    socketio.emit("run_error", {
                        "tab_id": tab_id,
                        "text": f"Process exited with code {completed['code']}",
                    }, to=sid)