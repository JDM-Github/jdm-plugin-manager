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

        namespace = data.get("namespace", "")
        command   = data.get("command", "")
        args      = data.get("args", {})
        cwd       = data.get("cwd") or None

        try:
            node       = _find_node()
            entry_path = _get_plugin_entry(namespace)
            cli_args   = _build_cli_args(node, entry_path, command, args)
        except RuntimeError as exc:
            emit("run_error", {"text": str(exc)})
            return

        q = queue.Queue()
        _prompt_queues[sid] = q

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

                    if line.startswith(PROMPT_PREFIX):
                        question = line[len(PROMPT_PREFIX):]
                        socketio.emit("run_prompt", {"text": question}, to=sid)

                        try:
                            answer = q.get(timeout=300)
                        except queue.Empty:
                            answer = ""

                        try:
                            proc.stdin.write(answer + "\n")
                            proc.stdin.flush()
                        except OSError:
                            pass
                        continue

                    socketio.emit("run_line", {"text": line}, to=sid)

                try:
                    proc.stdin.close()
                except OSError:
                    pass

                proc.wait()
                socketio.emit(
                    "run_done",
                    {"code": proc.returncode, "success": proc.returncode == 0},
                    to=sid,
                )

            except Exception as exc:
                socketio.emit("run_error", {"text": str(exc)}, to=sid)
            finally:
                _prompt_queues.pop(sid, None)

        socketio.start_background_task(_run)

    def on_run_answer(self, data):
        sid    = request.sid
        print("SID ON RUN ANSWER:", sid)
        answer = data.get("answer", "")
        q = _prompt_queues.get(sid)
        if q:
            q.put(answer)