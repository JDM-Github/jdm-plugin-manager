import json
import os
import requests
from packaging.version import Version, InvalidVersion
from flask import request
from app.manager.cache import CacheManager
from app.core.plugin_service import PluginService
from app.manager.supabase import SupabaseManager
from jdm_electron_flask import JDMBlueprint, success, error
from app.core.convenience.plugin_partials_table import PluginPartialsTable
from app.core.convenience.plugin_table import PluginsTable

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

def _parse_version(v: str) -> Version:
    try:
        return Version(v)
    except InvalidVersion:
        raise ValueError(f"Invalid version string: '{v}'")


def _read_package_json(link_path: str) -> dict:
    """
    Read and parse the package.json at link_path.

    Expected shape (jdmPlugin key is required):
    {
        "name":    "jdm-electron-flask",
        "version": "1.0.17",
        "jdmPlugin": {
            "namespace":   "electron-flask",
            "description": "...",
            "commands": [
                { "name": "create", "description": "...", "fields": [...] },
                ...
            ]
        }
    }
    Returns:
        {
            "name":        str,   # top-level package name
            "version":     str,   # top-level version
            "namespace":   str,   # jdmPlugin.namespace
            "description": str,   # jdmPlugin.description
            "commands":    list,  # jdmPlugin.commands (full objects)
        }

    Raises:
        FileNotFoundError  — package.json missing at path
        ValueError         — jdmPlugin key absent or malformed JSON
    """
    pkg_path = os.path.join(link_path, "package.json")

    if not os.path.isfile(pkg_path):
        raise FileNotFoundError(f"package.json not found at '{pkg_path}'")

    with open(pkg_path, "r", encoding="utf-8") as fh:
        try:
            pkg = json.load(fh)
        except json.JSONDecodeError as exc:
            raise ValueError(f"package.json is not valid JSON: {exc}") from exc

    jdm = pkg.get("jdmPlugin")
    if not jdm:
        raise ValueError("package.json is missing the 'jdmPlugin' key")

    return {
        "name":        pkg.get("name", ""),
        "version":     pkg.get("version", "1.0.0"),
        "namespace":   jdm.get("namespace", ""),
        "description": jdm.get("description", ""),
        "commands":    jdm.get("commands", []),
    }


def _augment_with_package_json(partial: dict) -> dict:
    """
    If the partial has a linkPath, try to read package.json and inject
    description + commands into the returned dict.
    Silently skips on any error (file moved, deleted, malformed, etc.)
    so that get_my_partials never fails just because a path went stale.
    """
    link_path = partial.get("linkPath", "")
    if not link_path:
        return {**partial, "description": "", "commands": []}
    try:
        pkg = _read_package_json(link_path)
        return {
            **partial,
            "version":     pkg["version"],
            "description": pkg["description"],
            "commands":    pkg["commands"],
        }
    except Exception:
        return {**partial, "description": "", "commands": []}

def _check_npm_exists(package: str, version: str) -> bool:
    url = f"https://registry.npmjs.org/{package}/{version}"
    resp = requests.get(url, timeout=8)
    return resp.status_code == 200

class ManageBlueprint(JDMBlueprint):
    """
    User-scoped plugin management. All routes require auth.

    Two separate resources:

    plugin_partials — personal workspace (draft/dev side).
        Fully editable: namespace, package, linkPath, version.
        Pushing a partial creates a new row in plugins (new version).
        Deleting a partial never touches plugins.

    plugins — published records (public catalog when approved).
        Created only via push from a partial.
        User can only delete (removes all version rows for that namespace).
        Deleting plugins never touches plugin_partials.

    Push rules:
        - partial.namespace must match latest plugin.namespace (if any prior push exists)
        - partial.package must match latest plugin.package (if any prior push exists)
        - partial.package must not be used by another namespace in plugins
        - partial.version must be strictly greater than latest plugin.version
        - The linked package.json name must match partial.package (validated client-side
          before push; backend re-checks via the description/commands payload presence)

    DB note — plugins.approved must be nullable:
        ALTER TABLE plugins ALTER COLUMN approved DROP NOT NULL;
        ALTER TABLE plugins ALTER COLUMN approved DROP DEFAULT;

        NULL  = pending review
        true  = approved (publicly visible)
        false = rejected

    plugin_partials schema:
        id           uuid primary key default gen_random_uuid()
        namespace    text unique not null
        package      text not null
        version      text not null default '1.0.0'
        "linkPath"   text not null default ''
        submitted_by text not null default ''
        created_at   timestamptz not null default now()
    """

    def __init__(self):
        super().__init__("manage", __name__, url_prefix="/manage")
    

    @JDMBlueprint.get("/dashboard", auth=True)
    def get_dashboard():
        """
        Aggregate dashboard stats in a single call.

        Returns:
            installed       - full registry dict (with live latestVersion for linked)
            catalog_count   - total approved plugins in the catalog (plugins_latest view)
            partials_count  - total partials owned by this user
            recent_plugins  - last 5 approved plugin pushes (across all users)
            top_commands    - flattened command frequency across catalog
        """
        try:
            # ── Installed plugins (local registry, live linked versions) ──
            installed: dict = PluginService.get_installed()
            installed_list  = list(installed.values())

            installed_count  = len(installed_list)
            linked_count     = sum(1 for p in installed_list if p.get("linked"))
            update_count     = sum(
                1 for p in installed_list
                if not p.get("linked")
                and p.get("latestVersion")
                and p.get("version") != p.get("latestVersion")
            )

            # ── Catalog count (approved only, latest per namespace) ────────
            try:
                catalog_rows  = SupabaseManager.fetch_all("plugins_latest", order="namespace")
                catalog_count = len(catalog_rows)
            except Exception:
                catalog_count = 0
                catalog_rows  = []

            # ── Partials count ─────────────────────────────────────────────
            try:
                from app.manager.supabase import SupabaseManager as SM
                username = _get_username() 
                partials = SM.fetch_all(
                    "plugin_partials",
                    filters={"submitted_by": username},
                ) if username else []
                partials_count = len(partials)
            except Exception:
                partials_count = 0

            try:
                recent = SupabaseManager.fetch_all(
                    "plugins",
                    filters={"approved": True},
                    order="-created_at",
                    limit=5,
                )
                recent_plugins = [
                    {
                        "namespace":    r["namespace"],
                        "package":      r["package"],
                        "version":      r["version"],
                        "submitted_by": r.get("submitted_by", ""),
                        "is_official":  r.get("is_official", False),
                        "created_at":   r.get("created_at"),
                    }
                    for r in recent
                ]
            except Exception:
                recent_plugins = []

            from collections import Counter
            cmd_counter: Counter = Counter()
            for row in catalog_rows:
                for cmd in (row.get("commands") or []):
                    cmd_counter[cmd] += 1
            top_commands = [
                {"command": cmd, "count": cnt}
                for cmd, cnt in cmd_counter.most_common(8)
            ]

            return success(
                {
                    "stats": {
                        "installed":    installed_count,
                        "linked":       linked_count,
                        "updates":      update_count,
                        "catalog":      catalog_count,
                        "partials":     partials_count,
                    },
                    "installed":        installed_list,
                    "recent_plugins":   recent_plugins,
                    "top_commands":     top_commands,
                },
                "Dashboard data retrieved",
            )

        except Exception as exc:
            return error(str(exc), status=500)

    # ══════════════════════════════════════════════════════════
    # PARTIALS
    # ══════════════════════════════════════════════════════════

    # ── GET /manage/partials ──────────────────────────────────

    @JDMBlueprint.get("/partials", auth=True)
    def get_my_partials():
        """
        Returns all partials owned by the user.
        For any partial with a linkPath, reads the local package.json and
        injects description + commands into the response so the UI can
        display them without a separate request.
        Stale / missing paths are handled gracefully (returns empty fields).
        """
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            partials = PluginPartialsTable.by_owner(username)
            augmented = [_augment_with_package_json(p) for p in partials]
            return success(augmented, f"{len(augmented)} partial(s) found")
        except Exception as exc:
            return error(str(exc), status=500)

    # ── POST /manage/partials ─────────────────────────────────

    @JDMBlueprint.post("/partials", auth=True)
    def create_partial():
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            body      = request.get_json(force=True)
            namespace = body["namespace"].strip()
            package   = body["package"].strip()
            version   = body.get("version", "1.0.0").strip()

            if not namespace:
                return error("namespace cannot be blank", status=422)
            if not package:
                return error("package cannot be blank", status=422)

            try:
                _parse_version(version)
            except ValueError as e:
                return error(str(e), status=422)

            existing_ns = PluginPartialsTable.by_namespace(namespace)
            if existing_ns:
                return error(f"Namespace '{namespace}' is already taken", status=409)

            existing_pkg = PluginPartialsTable.by_package(package)
            if existing_pkg:
                return error(
                    f"Package '{package}' is already used by namespace '{existing_pkg['namespace']}'",
                    status=409,
                )

            data = {
                "namespace":    namespace,
                "package":      package,
                "version":      version,
                "linkPath":     "",
                "submitted_by": username,
            }

            created = PluginPartialsTable.create(data)
            return success(
                {**created, "description": "", "commands": []},
                "Partial created",
                status=201,
            )
        except Exception as exc:
            return error(str(exc), status=500)

    # ── PUT /manage/partials/<namespace> ──────────────────────

    @JDMBlueprint.put("/partials/<namespace>", auth=True)
    def update_partial(namespace: str):
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            partial = PluginPartialsTable.by_namespace_and_owner(namespace, username)
            if not partial:
                return error(f"Partial '{namespace}' not found or not yours", status=404)

            body = request.get_json(force=True)
            for protected in ("submitted_by", "created_at"):
                body.pop(protected, None)

            allowed: dict = {}

            # ── namespace ──
            if "namespace" in body:
                new_ns = body["namespace"].strip()
                if not new_ns:
                    return error("namespace cannot be blank", status=422)
                if new_ns != namespace:
                    conflict = PluginPartialsTable.by_namespace(new_ns)
                    if conflict:
                        return error(f"Namespace '{new_ns}' is already taken", status=409)
                    allowed["namespace"] = new_ns

            # ── package ──
            if "package" in body:
                pkg = body["package"].strip()
                if not pkg:
                    return error("package cannot be blank", status=422)
                if pkg != partial["package"]:
                    conflict = PluginPartialsTable.by_package(pkg)
                    if conflict and conflict["namespace"] != namespace:
                        return error(
                            f"Package '{pkg}' is already used by namespace '{conflict['namespace']}'",
                            status=409,
                        )
                    allowed["package"] = pkg

            # ── version ──
            if "version" in body:
                v = body["version"].strip()
                if not v:
                    return error("version cannot be blank", status=422)
                try:
                    _parse_version(v)
                except ValueError as e:
                    return error(str(e), status=422)
                allowed["version"] = v

            # ── linkPath ──
            if "linkPath" in body:
                allowed["linkPath"] = body["linkPath"].strip()

            if not allowed:
                return error("No updatable fields provided", status=422)

            updated = PluginPartialsTable.update(namespace, allowed)
            return success(_augment_with_package_json(updated), "Partial updated")
        except Exception as exc:
            return error(str(exc), status=500)

    # ── DELETE /manage/partials/<namespace> ───────────────────

    @JDMBlueprint.delete("/partials/<namespace>", auth=True)
    def delete_partial(namespace: str):
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            partial = PluginPartialsTable.by_namespace_and_owner(namespace, username)
            if not partial:
                return error(f"Partial '{namespace}' not found or not yours", status=404)

            deleted = PluginPartialsTable.delete(namespace)
            return success(deleted, f"Partial '{namespace}' deleted")
        except Exception as exc:
            return error(str(exc), status=500)

    # ── POST /manage/partials/<namespace>/link ────────────────
    # NOTE: validate= intentionally omitted — URL param <namespace> would
    # collide with the injected `data` positional arg from the validator,
    # causing "multiple values for argument 'namespace'". Validation is
    # done manually inside the function instead.

    @JDMBlueprint.post("/partials/<namespace>/link", auth=True)
    def link_partial(namespace: str):
        """
        Persist a local linkPath for a partial, then read the package.json
        at that path to:
          - Validate that package.json["name"] matches partial.package
          - Validate that jdmPlugin.namespace matches the partial's namespace
          - Sync version from package.json root version → partial.version
          - Return description + commands from jdmPlugin so the frontend
            can display them immediately without a separate fetch.

        Response data shape:
        {
            ...partial row fields...,
            "description": "...",      # from jdmPlugin.description
            "commands":    [...],      # from jdmPlugin.commands (full objects)
        }
        """
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            partial = PluginPartialsTable.by_namespace_and_owner(namespace, username)
            if not partial:
                return error(f"Partial '{namespace}' not found or not yours", status=404)

            body      = request.get_json(force=True)
            link_path = body.get("link_path", "").strip()

            if not link_path:
                return error("link_path cannot be blank", status=422)

            # ── Read + validate package.json ──────────────────
            try:
                pkg = _read_package_json(link_path)
            except FileNotFoundError as e:
                return error(str(e), status=422)
            except ValueError as e:
                return error(str(e), status=422)

            # package name must match
            if pkg["name"] != partial["package"]:
                return error(
                    f"package.json name '{pkg['name']}' does not match "
                    f"partial package '{partial['package']}'",
                    status=422,
                )

            # jdmPlugin.namespace must match
            if pkg["namespace"] and pkg["namespace"] != namespace:
                return error(
                    f"jdmPlugin.namespace '{pkg['namespace']}' does not match "
                    f"partial namespace '{namespace}'",
                    status=422,
                )

            # ── Persist linkPath + sync version ──────────────
            updated = PluginPartialsTable.update(namespace, {
                "linkPath": link_path,
                "version":  pkg["version"],
            })

            return success(
                {
                    **updated,
                    "description": pkg["description"],
                    "commands":    pkg["commands"],
                },
                f"Partial '{namespace}' linked — v{pkg['version']} synced from package.json",
            )
        except Exception as exc:
            return error(str(exc), status=500)

    # ── DELETE /manage/partials/<namespace>/link ──────────────

    @JDMBlueprint.delete("/partials/<namespace>/link", auth=True)
    def unlink_partial(namespace: str):
        """Clear the linkPath for a partial (unlink)."""
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            partial = PluginPartialsTable.by_namespace_and_owner(namespace, username)
            if not partial:
                return error(f"Partial '{namespace}' not found or not yours", status=404)

            updated = PluginPartialsTable.update(namespace, {"linkPath": ""})
            return success(
                {**updated, "description": "", "commands": []},
                f"Partial '{namespace}' unlinked",
            )
        except Exception as exc:
            return error(str(exc), status=500)

    # ── POST /manage/partials/<namespace>/push ────────────────
    @staticmethod
    def _invalidate_npm_cache(pkg_name: str) -> None:
        CacheManager.invalidate(f"npm:version:{pkg_name}")
        CacheManager.invalidate(f"npm:downloads:{pkg_name}")
        CacheManager.invalidate(f"npm:readme:{pkg_name}")

    @JDMBlueprint.post("/partials/<namespace>/push", auth=True)
    def push_partial(namespace: str):
        """
        Promote a partial to a published plugin (new version row in plugins).

        Re-reads the local package.json at push time to ensure description,
        commands, and version are always fresh — not stale state from the client.

        Validation order:
        1. Partial exists and belongs to user.
        2. Partial must be linked (linkPath not empty).
        3. package.json must be readable and valid at linkPath.
        4. If a prior push exists for this namespace:
             a. partial.package must match latest plugin.package
             b. partial.version must be strictly greater than latest plugin.version
        5. partial.package must not exist in plugins under a different namespace.
        """
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            partial = PluginPartialsTable.by_namespace_and_owner(namespace, username)
            if not partial:
                return error(f"Partial '{namespace}' not found or not yours", status=404)

            # Gate 1: must be linked
            link_path = partial.get("linkPath", "")
            if not link_path:
                return error(
                    "Partial must be linked to a local path before pushing",
                    status=422,
                )

            try:
                pkg = _read_package_json(link_path)
            except (FileNotFoundError, ValueError) as e:
                return error(str(e), status=422)

            if pkg["name"] != partial["package"]:
                return error(
                    f"package.json name '{pkg['name']}' does not match "
                    f"partial package '{partial['package']}'",
                    status=422,
                )

            description = pkg["description"]
            commands    = pkg["commands"]
            push_version = pkg["version"]

            if not description:
                return error("jdmPlugin.description is empty in package.json", status=422)
            if not isinstance(commands, list):
                return error("jdmPlugin.commands must be a list in package.json", status=422)

            # Sync version on partial if package.json moved ahead
            if push_version != partial.get("version"):
                PluginPartialsTable.update(namespace, {"version": push_version})

            # Gate 3: check against existing plugins for this namespace
            latest_plugin = PluginsTable.by_namespace(namespace)
            if latest_plugin:
                if latest_plugin["package"] != partial["package"]:
                    return error(
                        f"Package mismatch: partial has '{partial['package']}' "
                        f"but the published plugin has '{latest_plugin['package']}'. "
                        f"Update the partial's package to match before pushing.",
                        status=422,
                    )

                try:
                    v_push   = _parse_version(push_version)
                    v_latest = _parse_version(latest_plugin["version"])
                except ValueError as e:
                    return error(str(e), status=422)

                if v_push <= v_latest:
                    return error(
                        f"package.json version '{push_version}' must be greater than "
                        f"the latest published version '{latest_plugin['version']}'. "
                        f"Bump the version in package.json before pushing.",
                        status=422,
                    )

            # Gate 4: package must not exist under a different namespace in plugins
            existing_pkg = PluginsTable.by_package(partial["package"])
            if existing_pkg and existing_pkg["namespace"] != namespace:
                return error(
                    f"Package '{partial['package']}' is already published "
                    f"under namespace '{existing_pkg['namespace']}'",
                    status=409,
                )

            npm_exists = _check_npm_exists(partial["package"], push_version)
            if not npm_exists:
                return error(
                    f"'{partial['package']}@{push_version}' was not found on npm. "
                    f"Run `npm publish` first, then push here.",
                    status=422,
                )

            plugin_data = {
                "namespace":    namespace,
                "package":      partial["package"],
                "version":      push_version,
                "description":  description,
                "commands":     [cmd["name"] for cmd in commands],
                "is_official":  username == "jdmaster",
                "approved":     True if username == "jdmaster" else None,
                "submitted_by": username,
            }
            ManageBlueprint._invalidate_npm_cache(pkg_name=partial["package"])
            created = PluginsTable.create(plugin_data)
            return success(created, f"'{namespace}' v{push_version} submitted for review", status=201)
        except Exception as exc:
            return error(str(exc), status=500)

    # ══════════════════════════════════════════════════════════
    # PLUGINS (published — read + delete only)
    # ══════════════════════════════════════════════════════════

    # ── GET /manage/plugins ───────────────────────────────────

    @JDMBlueprint.get("/plugins", auth=True)
    def get_my_plugins():
        """
        Returns the latest version of each plugin owned by the user.
        Approval state (null/true/false) is included so the UI can show pending/approved/rejected.
        """
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            plugins = PluginsTable.by_owner(username)
            return success(plugins, f"{len(plugins)} plugin(s) found")
        except Exception as exc:
            return error(str(exc), status=500)

    # ── GET /manage/plugins/<namespace>/versions ──────────────

    @JDMBlueprint.get("/plugins/<namespace>/versions", auth=True)
    def get_plugin_versions(namespace: str):
        """Returns all pushed versions for a namespace, newest first."""
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            latest = PluginsTable.by_namespace_and_owner(namespace, username)
            if not latest:
                return error(f"Plugin '{namespace}' not found or not yours", status=404)

            versions = PluginsTable.all_versions(namespace)
            return success(versions, f"{len(versions)} version(s) found")
        except Exception as exc:
            return error(str(exc), status=500)

    # ── DELETE /manage/plugins/<namespace> ────────────────────

    @JDMBlueprint.delete("/plugins/<namespace>", auth=True)
    def delete_plugin(namespace: str):
        """
        Deletes ALL version rows for a namespace from plugins.
        Does NOT touch plugin_partials — the partial remains intact.
        """
        try:
            username = _get_username()
            if not username:
                return error("X-Username header is required", status=400)

            plugin = PluginsTable.by_namespace_and_owner(namespace, username)
            if not plugin:
                return error(f"Plugin '{namespace}' not found or not yours", status=404)

            deleted = PluginsTable.delete_all_versions(namespace)
            return success(deleted, f"All versions of '{namespace}' deleted")
        except Exception as exc:
            return error(str(exc), status=500)