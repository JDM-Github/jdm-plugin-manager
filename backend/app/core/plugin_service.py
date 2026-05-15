import json
import os
import subprocess
import sys
import tempfile
import shutil
import time
import contextlib
from pathlib import Path
from typing import Optional
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.manager.supabase import SupabaseManager
from app.manager.cache import CacheManager
from jdm_electron_flask import Printer
kwargs = {}
if sys.platform == "win32":
    kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW

# ─────────────────────────────────────────────────────────────
#  Constants
# ─────────────────────────────────────────────────────────────

CONFIG_DIR  = Path.home() / ".jdm-cli"
PLUGIN_FILE = CONFIG_DIR / "plugins.json"

def _get_available_packages(username: str | None = None) -> list[dict]:
    try:
        approved_rows = SupabaseManager.fetch_all(
            "plugins_latest",
            order="namespace",
        )

        if not username:
            return approved_rows

        own_rows = SupabaseManager.fetch_all(
            "plugins",
            filters={"submitted_by": username},
            order="-created_at",
        )
        own_latest: dict[str, dict] = {}
        for row in own_rows:
            ns = row["namespace"]
            if ns not in own_latest:
                own_latest[ns] = row

        approved_namespaces = {r["namespace"] for r in approved_rows}
        extra = [
            row for ns, row in own_latest.items()
            if ns not in approved_namespaces and row.get("approved") is not True
        ]

        return approved_rows + extra

    except Exception as exc:
        Printer.error(f"Failed to fetch available packages from Supabase: {exc}")
        return []

# ─────────────────────────────────────────────────────────────
#  Registry helpers
# ─────────────────────────────────────────────────────────────

def _resolve_cmd(name: str) -> str:
    """Return 'npm.cmd' on Windows, 'npm' elsewhere."""
    if sys.platform == "win32":
        return name + ".cmd"
    return name

def _run(cmd: list[str], cwd: Optional[str] = None, capture: bool = False) -> subprocess.CompletedProcess:
    cmd[0] = _resolve_cmd(cmd[0])
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture,
        text=True,
        check=True,
        **kwargs,
    )

def _ensure_config() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if not PLUGIN_FILE.exists():
        PLUGIN_FILE.write_text(json.dumps({}, indent=2))


def _load_registry() -> dict:
    _ensure_config()
    try:
        return json.loads(PLUGIN_FILE.read_text("utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        Printer.error(f"Failed to read plugin registry: {exc}")
        return {}

def _save_registry(registry: dict) -> None:
    """Atomic write — avoids corruption on power-loss / crash."""
    _ensure_config()
    fd, tmp_path = tempfile.mkstemp(dir=CONFIG_DIR, suffix=".json.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)
        shutil.move(tmp_path, PLUGIN_FILE)
    except Exception as exc:
        with contextlib.suppress(OSError):
            os.unlink(tmp_path)
        raise RuntimeError(f"Failed to save plugin registry: {exc}") from exc


# ─────────────────────────────────────────────────────────────
#  npm helpers
# ─────────────────────────────────────────────────────────────

def _npm_global_root() -> str:
    result = _run(["npm", "root", "-g"], capture=True)  # ← was raw subprocess.run
    return result.stdout.strip()


def _read_package_json(pkg_name: str) -> Optional[dict]:
    try:
        global_root = _npm_global_root()
        pkg_json_path = Path(global_root) / pkg_name / "package.json"
        if pkg_json_path.exists():
            return json.loads(pkg_json_path.read_text("utf-8"))
    except Exception as exc:
        Printer.error(f"Could not read package.json for '{pkg_name}': {exc}")
    return None


def _validate_jdm_plugin(meta: dict, pkg_name: str) -> dict:
    """Raise ValueError if the package is not a valid jdm-cli plugin."""
    jdm_plugin = meta.get("jdmPlugin")
    if not jdm_plugin:
        raise ValueError(
            f"'{pkg_name}' is not a valid jdm-cli plugin "
            f"(missing 'jdmPlugin' field in package.json)"
        )
    if not jdm_plugin.get("namespace"):
        raise ValueError(
            f"'{pkg_name}' jdmPlugin metadata is missing a 'namespace' field"
        )
    return jdm_plugin

def _read_linked_version(local_path: str) -> str | None:
    """Read the live version from a linked plugin's local package.json."""
    try:
        pkg_json = Path(local_path) / "package.json"
        if pkg_json.exists():
            return json.loads(pkg_json.read_text("utf-8")).get("version")
    except Exception:
        pass
    return None

# ─────────────────────────────────────────────────────────────
#  PluginService
# ─────────────────────────────────────────────────────────────

class PluginService:

    PLUGIN_NPM_TTL = 86400

    @staticmethod
    def get_available(username: str | None = None) -> list[dict]:
        available_packages = _get_available_packages(username=username)
        registry = _load_registry()

        def enrich(pkg: dict) -> dict:
            return PluginService._enrich_with_npm(pkg, registry)

        results = [None] * len(available_packages)
        with ThreadPoolExecutor(max_workers=max(len(available_packages), 1)) as executor:
            future_to_idx = {
                executor.submit(enrich, pkg): idx
                for idx, pkg in enumerate(available_packages)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    results[idx] = future.result()
                except Exception as exc:
                    Printer.error(f"Failed to enrich plugin at index {idx}: {exc}")
                    pkg       = available_packages[idx]
                    installed = registry.get(pkg["namespace"])
                    if installed and installed.get("linked") and installed.get("localPath"):
                        live_version = _read_linked_version(installed["localPath"])
                        if live_version:
                            installed = {**installed, "version": live_version}

                    results[idx] = {
                        **pkg,
                        "installed":        bool(installed),
                        "official":         pkg.get("is_official", False),
                        "approved":         pkg.get("approved", False),
                        "submitted_by":     pkg.get("submitted_by", False),
                        "createdAt":        pkg.get("created_at", None),
                        "latestVersion":    pkg.get("version", "1.0.0"),
                        "installedVersion": installed.get("version") if installed else None,
                        "linked":           installed.get("linked", False) if installed else False,
                        "localPath":        installed.get("localPath") if installed else None,
                        "npmVersion":       None,
                        "weeklyDownloads":  None,
                        "readme":           None,
                    }

        return results

    @staticmethod
    def get_available_one(namespace: str) -> Optional[dict]:
        available_packages = _get_available_packages()
        pkg = next((p for p in available_packages if p["namespace"] == namespace), None)
        if pkg is None:
            return None
        registry = _load_registry()
        return PluginService._enrich_with_npm(pkg, registry)

    @staticmethod
    def _invalidate_npm_cache(pkg_name: str) -> None:
        CacheManager.invalidate(f"npm:version:{pkg_name}")
        CacheManager.invalidate(f"npm:downloads:{pkg_name}")
        CacheManager.invalidate(f"npm:readme:{pkg_name}")

    @staticmethod
    def _enrich_with_npm(pkg: dict, registry: dict) -> dict:
        pkg_name  = pkg["package"]
        installed = registry.get(pkg["namespace"])
        if installed and installed.get("linked") and installed.get("localPath"):
            live_version = _read_linked_version(installed["localPath"])
            if live_version:
                installed = {**installed, "version": live_version}

        def fetch_version() -> Optional[str]:
            return CacheManager.get_or_fetch(
                key=f"npm:version:{pkg_name}",
                fetch_fn=lambda: _run(["npm", "view", pkg_name, "version"], capture=True).stdout.strip(),
                ttl=PluginService.PLUGIN_NPM_TTL,
            )

        def fetch_downloads() -> Optional[int]:
            def _fetch():
                url = f"https://api.npmjs.org/downloads/point/last-week/{pkg_name}"
                with urllib.request.urlopen(url, timeout=5) as resp:
                    return json.loads(resp.read().decode()).get("downloads")

            return CacheManager.get_or_fetch(
                key=f"npm:downloads:{pkg_name}",
                fetch_fn=_fetch,
                ttl=PluginService.PLUGIN_NPM_TTL,
            )

        def fetch_readme() -> Optional[str]:
            return CacheManager.get_or_fetch(
                key=f"npm:readme:{pkg_name}",
                fetch_fn=lambda: _run(["npm", "view", pkg_name, "readme"], capture=True).stdout.strip() or None,
                ttl=PluginService.PLUGIN_NPM_TTL,
            )

        with ThreadPoolExecutor(max_workers=3) as executor:
            future_version   = executor.submit(fetch_version)
            future_downloads = executor.submit(fetch_downloads)
            future_readme    = executor.submit(fetch_readme)

            npm_version      = future_version.result()
            weekly_downloads = future_downloads.result()
            readme           = future_readme.result()

        return {
            "namespace":        pkg["namespace"],
            "package":          pkg_name,
            "official":         pkg.get("is_official", False),
            "approved":         pkg.get("approved", False),
            "submitted_by":     pkg.get("submitted_by", False),
            "createdAt":        pkg.get("created_at", None),
            "description":      pkg.get("description", ""),
            "commands":         pkg.get("commands", []),
            "installed":        bool(installed),
            "latestVersion":    pkg.get("version", "1.0.0"),
            "installedVersion": installed.get("version") if installed else None,
            "linked":           installed.get("linked", False) if installed else False,
            "localPath":        installed.get("localPath") if installed else None,
            "npmVersion":       npm_version,
            "weeklyDownloads":  weekly_downloads,
            "readme":           readme,
        }


    # PLUGINS
    @staticmethod
    def get_installed() -> dict:
        registry = _load_registry()
        result = {}
        for namespace, entry in registry.items():
            entry = {**entry, "latestVersion": entry.get("version", "1.0.0")}
            if entry.get("linked") and entry.get("localPath"):
                live_version = _read_linked_version(entry["localPath"])
                if live_version:
                    entry = {**entry, "version": live_version}                    

            result[namespace] = entry
        return result

    @staticmethod
    def get_plugin(namespace: str) -> Optional[dict]:
        entry = _load_registry().get(namespace)
        if entry and entry.get("linked") and entry.get("localPath"):
            live_version = _read_linked_version(entry["localPath"])
            if live_version:
                entry = {**entry, "version": live_version}
        return entry
    
    # MANAGER
    
    @staticmethod
    def install(pkg_name: str) -> dict:
        if "@" in pkg_name.lstrip("@"):
            install_target = pkg_name
            # "jdm-electron-flask@1.0.17" → "jdm-electron-flask"
            # "@scope/pkg@1.0.0"          → "@scope/pkg"
            bare_name = pkg_name.lstrip("@").split("@")[0]
            if pkg_name.startswith("@"):
                bare_name = "@" + bare_name
        else:
            install_target = f"{pkg_name}@latest"
            bare_name = pkg_name

        Printer.info(f"Installing '{install_target}' globally via npm...")

        try:
            _run(["npm", "install", "-g", install_target])
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"npm install -g {install_target} failed: {exc.stderr}") from exc

        meta = _read_package_json(bare_name)
        if meta is None:
            raise RuntimeError(
                f"Could not find package.json for '{bare_name}' after install. "
                "The package may have installed to an unexpected location."
            )

        jdm_plugin = _validate_jdm_plugin(meta, bare_name)
        namespace  = jdm_plugin["namespace"]

        registry = _load_registry()
        entry = {
            "package":     bare_name,
            "version":     meta.get("version", "unknown"),
            "namespace":   namespace,
            "description": jdm_plugin.get("description", ""),
            "commands":    jdm_plugin.get("commands", []),
            "anonymous":   False,
            "linked":      False,
            "localPath":   None,
            "installedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        registry[namespace] = entry
        _save_registry(registry)

        Printer.success(f"Plugin '{bare_name}' installed as namespace '{namespace}'")
        PluginService._invalidate_npm_cache(bare_name)
        return entry

    @staticmethod
    def link(pkg_name: str, local_path: str) -> dict:
        """
        npm link a locally developed plugin for dev testing.
        Reads package.json from <local_path>, validates, registers with linked=True.
        """
        local_path = os.path.abspath(local_path)
        pkg_json_path = Path(local_path) / "package.json"

        if not pkg_json_path.exists():
            raise FileNotFoundError(
                f"No package.json found at '{local_path}'"
            )

        meta           = json.loads(pkg_json_path.read_text("utf-8"))
        actual_pkg_name = meta.get("name")

        if not actual_pkg_name:
            raise ValueError(
                f"No 'name' field found in package.json at '{local_path}'"
            )

        if actual_pkg_name != pkg_name:
            raise ValueError(
                f"Package name mismatch: expected '{pkg_name}' but package.json declares '{actual_pkg_name}'. "
                f"Make sure you're linking the correct directory."
            )

        jdm_plugin = _validate_jdm_plugin(meta, pkg_name)
        namespace  = jdm_plugin["namespace"]

        Printer.info(f"Linking '{pkg_name}' from '{local_path}'...")

        try:
            _run(["npm", "link"], cwd=local_path)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"npm link failed: {exc.stderr}") from exc

        registry = _load_registry()
        entry = {
            "package":     actual_pkg_name,
            "version":     meta.get("version", "dev"),
            "namespace":   namespace,
            "description": jdm_plugin.get("description", ""),
            "commands":    jdm_plugin.get("commands", []),
            "anonymous":   False,
            "linked":      True,
            "localPath":   local_path,
            "installedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        registry[namespace] = entry
        _save_registry(registry)

        Printer.success(f"Plugin '{pkg_name}' linked from '{local_path}'")
        PluginService._invalidate_npm_cache(pkg_name)
        return entry

    @staticmethod
    def link_anonymous(local_path: str) -> dict:
        local_path = os.path.abspath(local_path)
        pkg_json_path = Path(local_path) / "package.json"

        if not pkg_json_path.exists():
            raise FileNotFoundError(
                f"No package.json found at '{local_path}'"
            )

        meta     = json.loads(pkg_json_path.read_text("utf-8"))
        pkg_name = meta.get("name")

        if not pkg_name:
            raise ValueError(
                f"No 'name' field found in package.json at '{local_path}'"
            )

        jdm_plugin = _validate_jdm_plugin(meta, pkg_name)
        namespace  = jdm_plugin["namespace"]

        Printer.info(f"Linking '{pkg_name}' from '{local_path}'...")

        try:
            _run(["npm", "link"], cwd=local_path)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"npm link failed: {exc.stderr}") from exc

        registry = _load_registry()
        entry = {
            "package":     pkg_name,
            "version":     meta.get("version", "dev"),
            "namespace":   namespace,
            "description": jdm_plugin.get("description", ""),
            "commands":    jdm_plugin.get("commands", []),
            "anonymous":   True,
            "linked":      True,
            "localPath":   local_path,
            "installedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        registry[namespace] = entry
        _save_registry(registry)

        Printer.success(f"Plugin '{pkg_name}' linked from '{local_path}'")
        PluginService._invalidate_npm_cache(pkg_name)
        return entry

    @staticmethod
    def uninstall(namespace: str) -> dict:
        """
        Uninstall (or unlink) a plugin by namespace.
        Returns the removed entry.
        """
        registry = _load_registry()
        entry = registry.get(namespace)

        if not entry:
            raise KeyError(f"Plugin '{namespace}' is not registered")

        pkg_name   = entry["package"]
        is_linked  = entry.get("linked", False)
        local_path = entry.get("localPath")

        if is_linked:
            Printer.info(f"Unlinking '{pkg_name}'...")
            try:
                _run(["npm", "unlink", "-g", pkg_name])
            except subprocess.CalledProcessError as exc:
                raise RuntimeError(f"npm unlink -g {pkg_name} failed: {exc.stderr}") from exc

            if local_path and Path(local_path).exists():
                try:
                    _run(["npm", "unlink", pkg_name], cwd=local_path)
                except subprocess.CalledProcessError:
                    Printer.error(f"Local unlink failed for '{pkg_name}' (non-fatal)")
        else:
            Printer.info(f"Uninstalling '{pkg_name}'...")
            try:
                _run(["npm", "uninstall", "-g", pkg_name])
            except subprocess.CalledProcessError as exc:
                raise RuntimeError(f"npm uninstall -g {pkg_name} failed: {exc.stderr}") from exc

        del registry[namespace]
        _save_registry(registry)

        Printer.success(f"Plugin '{namespace}' removed")
        PluginService._invalidate_npm_cache(pkg_name)
        return entry

    @staticmethod
    def update(namespace: str) -> dict:
        """
        Re-install the latest version of a plugin.
        Linked plugins are skipped (managed manually in local dev).
        """
        registry = _load_registry()
        entry = registry.get(namespace)

        if not entry:
            raise KeyError(f"Plugin '{namespace}' is not registered")

        if entry.get("linked"):
            raise ValueError(
                f"Plugin '{namespace}' is linked (local dev). "
                "Update it in its source directory instead."
            )

        pkg_name     = entry["package"]
        prev_version = entry.get("version", "unknown")

        Printer.info(f"Updating '{pkg_name}' (current: {prev_version})...")

        try:
            _run(["npm", "install", "-g", f"{pkg_name}@latest"])
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"npm install -g {pkg_name}@latest failed: {exc.stderr}") from exc

        meta = _read_package_json(pkg_name)
        if meta is None:
            raise RuntimeError(f"Could not read package.json for '{pkg_name}' after update")

        new_version = meta.get("version", "unknown")
        entry["version"]    = new_version
        entry["updatedAt"]  = time.strftime("%Y-%m-%dT%H:%M:%S")
        registry[namespace] = entry
        _save_registry(registry)

        Printer.success(f"Plugin '{pkg_name}' updated: {prev_version} → {new_version}")
        PluginService._invalidate_npm_cache(pkg_name)
        return {**entry, "previousVersion": prev_version}

    @staticmethod
    def check_outdated(namespace: str) -> dict:
        """
        Compare installed version against npm registry latest.
        Returns { namespace, installed, latest, outdated }.
        """
        registry = _load_registry()
        entry = registry.get(namespace)

        if not entry:
            raise KeyError(f"Plugin '{namespace}' is not registered")

        if entry.get("linked"):
            return {
                "namespace": namespace,
                "installed": entry.get("version", "dev"),
                "latest":    None,
                "outdated":  False,
                "note":      "Linked plugin — version tracking skipped",
            }

        pkg_name  = entry["package"]
        installed = entry.get("version", "0.0.0")

        try:
            result = _run(  # ← was raw subprocess.run
                ["npm", "view", pkg_name, "version"],
                capture=True,
            )
            latest = result.stdout.strip()
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"Could not fetch latest version for '{pkg_name}': {exc.stderr}"
            ) from exc

        return {
            "namespace": namespace,
            "installed": installed,
            "latest":    latest,
            "outdated":  installed != latest,
        }

    @staticmethod
    def get_schema(namespace: str) -> Optional[dict]:
        """Read the jdmPlugin block from the installed package's package.json."""
        entry = PluginService.get_plugin(namespace)

        if not entry:
            return None
        meta = _read_package_json(entry["package"])
        if not meta:
            return None
        jdm = meta.get("jdmPlugin", {})

        return {
            "namespace":   jdm.get("namespace", namespace),
            "description": jdm.get("description", ""),
            "commands":    jdm.get("commands", []),
        }
