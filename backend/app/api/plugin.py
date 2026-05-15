import os
import sys
from pathlib import Path
from flask import request
from app.manager.supabase import SupabaseManager
from jdm_electron_flask import JDMBlueprint, success, error
from app.core.plugin_service import PluginService
import win32gui
import win32com.client

def _get_bundle_dir() -> str:
    """Where bundled --add-data files are. Works for both --onefile and --onedir."""
    if getattr(sys, 'frozen', False):
        meipass = getattr(sys, '_MEIPASS', None)
        if meipass:
            return meipass                        # --onefile: extracted temp dir
        return os.path.dirname(sys.executable)    # --onedir: files sit next to exe
    return os.getcwd()

def get_smart_cwd() -> str:
    try:
        targets = {
            "CabinetWClass":      "explorer",
            "Chrome_WidgetWin_1": "vscode",
        }
        found = []
        z, hwnd = 0, win32gui.GetTopWindow(None)
        while hwnd:
            cls = win32gui.GetClassName(hwnd)
            if cls in targets and win32gui.IsWindowVisible(hwnd):
                found.append((z, targets[cls], hwnd))
            hwnd = win32gui.GetWindow(hwnd, 2)
            z += 1

        if not found:
            return os.getcwd()

        found.sort(key=lambda x: x[0])
        print(found)
        _, app, hwnd = found[0]

        if app == "vscode":
            import json
            from urllib.parse import unquote
            storage = Path(os.environ["APPDATA"]) / "Code/User/globalStorage/storage.json"
            data = json.loads(storage.read_text(encoding="utf-8"))
            raw = data["windowsState"]["lastActiveWindow"].get("folder", "")
            if raw:
                path = unquote(raw.replace("file://", ""))
                if path.startswith("/") and path[2] == ":":
                    path = path[1:]
                return path
        elif app == "explorer":
            shell = win32com.client.Dispatch("Shell.Application")
            for window in shell.Windows():
                try:
                    if window.HWND == hwnd:
                        return window.Document.Folder.Self.Path
                except Exception:
                    continue
    except Exception:
        pass

    return os.getcwd()

def _get_username() -> str | None:
    """
    Pull the authenticated username from the request.

    The frontend sends the npm username (resolved via auth/npm-whoami)
    as the X-Username header on every manage request.
    This header is only trusted because the route already passed
    JDMBlueprint's auth=True gate (X-Auth-Token check).
    """
    raw = request.headers.get("X-Username", "").strip()
    return raw or None

class PluginBlueprint(JDMBlueprint):
    def __init__(self):
        super().__init__("plugin", __name__)

    @JDMBlueprint.get("/get-all", auth=True)
    def get_installed():
        plugins = PluginService.get_installed()
        return success(
            {"plugins": plugins, "count": len(plugins)},
            "Installed plugins retrieved",
        )

    # ── GET /available ────────────────────────────────
    # Returns the catalog + npm metadata + install status of each
    @JDMBlueprint.get("/available", auth=True)
    def get_available():
        username = _get_username()
        plugins = PluginService.get_available(username=username)
        return success(
            {"plugins": plugins, "count": len(plugins)},
            "Available plugins retrieved",
        )
    
    @JDMBlueprint.get("/available/<namespace>/versions", auth=True)
    def get_plugin_versions(namespace):
        try:
            rows = SupabaseManager.fetch_all(
                "plugins",
                filters={"namespace": namespace, "approved": True},
                order="-created_at",
            )
            if not rows:
                return error(f"No approved versions found for '{namespace}'", 404)

            versions = [
                {
                    "version":      r["version"],
                    "description":  r.get("description", ""),
                    "commands":     r.get("commands", []),
                    "submitted_by": r.get("submitted_by", ""),
                    "is_official":  r.get("is_official", False),
                    "created_at":   r.get("created_at"),
                }
                for r in rows
            ]

            return success(
                {"namespace": namespace, "versions": versions},
                f"{len(versions)} version(s) found for '{namespace}'",
            )
        except Exception as exc:
            return error(str(exc), status=500)
 

    # ── GET /available/<namespace> ────────────────────
    # Returns a single catalog entry enriched with npm metadata
    @JDMBlueprint.get("/available/<namespace>", auth=True)
    def get_available_one(namespace):
        plugin = PluginService.get_available_one(namespace)
        if plugin is None:
            return error(f"Plugin '{namespace}' is not in the catalog", 404)
        return success(plugin, f"Plugin '{namespace}' retrieved")

    # ── GET /<namespace> ──────────────────────────────
    # Returns a single plugin entry

    @JDMBlueprint.get("/<namespace>", auth=True)
    def get_plugin(namespace):
        plugin = PluginService.get_plugin(namespace)
        if plugin is None:
            return error(f"Plugin '{namespace}' is not installed", 404)
        return success(plugin, f"Plugin '{namespace}' found")

    # ── POST /install ─────────────────────────────────
    # Body: { "package": "jdm-electron-flask" }

    @JDMBlueprint.post("/install", auth=True, validate="package")
    def install(data):
        pkg_name = data["package"]
        if not isinstance(pkg_name, str) or not pkg_name.strip():
            return error("'package' must be a non-empty string", 400)
        try:
            entry = PluginService.install(pkg_name.strip())
            return success(entry, f"Plugin '{pkg_name}' installed successfully")
        except ValueError as exc:
            return error(str(exc), 422)
        except RuntimeError as exc:
            print("EXC:", str(exc))
            return error(str(exc), 500)

    # ── POST /link ────────────────────────────────────
    # Body: { "package": "jdm-tools", "localPath": "/path/to/local/pkg" }

    @JDMBlueprint.post("/link", auth=True, validate="package")
    def link(data):
        pkg_name   = data.get("package", "")
        local_path = data.get("localPath", "")

        if not isinstance(pkg_name, str) or not pkg_name.strip():
            return error("'package' must be a non-empty string", 400)
        if not isinstance(local_path, str) or not local_path.strip():
            return error("'localPath' must be a non-empty string", 400)

        try:
            entry = PluginService.link(pkg_name.strip(), local_path.strip())
            return success(entry, f"Plugin '{pkg_name}' linked from '{local_path}'")
        except FileNotFoundError as exc:
            return error(str(exc), 404)
        except ValueError as exc:
            return error(str(exc), 422)
        except RuntimeError as exc:
            return error(str(exc), 500)
    
    @JDMBlueprint.post("/link_anonymous", auth=True, validate="localPath")
    def link_anonymous(data):
        local_path = data.get("localPath", "")

        if not isinstance(local_path, str) or not local_path.strip():
            return error("'localPath' must be a non-empty string", 400)
        try:
            entry = PluginService.link_anonymous(local_path.strip())
            return success(entry, f"Plugin linked from '{local_path}'")
        except FileNotFoundError as exc:
            return error(str(exc), 404)
        except ValueError as exc:
            return error(str(exc), 422)
        except RuntimeError as exc:
            return error(str(exc), 500)

    # ── DELETE /<namespace> ───────────────────────────
    # Uninstall or unlink a plugin

    @JDMBlueprint.post("/delete/<namespace>", auth=True)
    def uninstall(namespace):
        try:
            removed = PluginService.uninstall(namespace)
            return success(removed, f"Plugin '{namespace}' removed successfully")
        except KeyError as exc:
            return error(str(exc), 404)
        except RuntimeError as exc:
            return error(str(exc), 500)

    # ── POST /<namespace>/update ──────────────────────
    # Re-install latest version

    @JDMBlueprint.post("/<namespace>/update", auth=True)
    def update(namespace):
        try:
            entry = PluginService.update(namespace)
            return success(
                entry,
                f"Plugin '{namespace}' updated to {entry['version']}",
            )
        except KeyError as exc:
            return error(str(exc), 404)
        except ValueError as exc:
            return error(str(exc), 422)
        except RuntimeError as exc:
            return error(str(exc), 500)

    # ── GET /<namespace>/outdated ─────────────────────
    # Check if a plugin has a newer version on npm

    @JDMBlueprint.get("/<namespace>/outdated", auth=True)
    def check_outdated(namespace):
        try:
            result = PluginService.check_outdated(namespace)
            msg = (
                f"Plugin '{namespace}' is outdated ({result['installed']} → {result['latest']})"
                if result["outdated"]
                else f"Plugin '{namespace}' is up to date ({result['installed']})"
            )
            return success(result, msg)
        except KeyError as exc:
            return error(str(exc), 404)
        except RuntimeError as exc:
            return error(str(exc), 500)
    

    @JDMBlueprint.get("/<namespace>/schema", auth=True)
    def get_schema(namespace):
        """Read jdmPlugin field schema from the installed package.json."""
        entry = PluginService.get_plugin(namespace)
        if not entry:
            return error(f"Plugin '{namespace}' is not installed", 404)
        schema = PluginService.get_schema(namespace)
        if schema is None:
            return error(f"Could not read schema for '{namespace}'", 404)
        return success(schema, f"Schema for '{namespace}' retrieved")

    @JDMBlueprint.post("/run/<namespace>", auth=True, validate="command")
    def run_plugin(data, namespace):
        """Validate the run request — actual execution is SSE streamed."""
        command = data.get("command", "").strip()
        if not command:
            return error("'command' must be a non-empty string", 400)
        return success({"namespace": namespace, "command": command}, "Ready to run")

    @JDMBlueprint.get("/cwd", auth=True)
    def get_cwd():
        return success({"cwd": get_smart_cwd()})

    @JDMBlueprint.get("/browse-folder", auth=True)
    def browse_folder():
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()

            base = _get_bundle_dir()
            root.iconbitmap(os.path.join(base, 'resources', 'transparent_icon.ico')) 
            root.wm_attributes('-topmost', True)
            path = filedialog.askdirectory(title="Select Working Directory") or None
            root.destroy()
        except Exception:
            import subprocess
            result = subprocess.run(
                [
                    "powershell", "-NoProfile", "-Command",
                    """
                    Add-Type -AssemblyName System.Windows.Forms
                    $f = New-Object System.Windows.Forms.FolderBrowserDialog
                    $f.Description = 'Select working directory'
                    $f.UseDescriptionForTitle = $true
                    $f.RootFolder = 'MyComputer'
                    $f.ShowNewFolderButton = $false
                    if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath } else { '' }
                    """
                ],
                capture_output=True, text=True
            )
            path = result.stdout.strip() or None

        return success({"cwd": path})