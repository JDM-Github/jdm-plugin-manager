import json
from flask import request
from jdm_electron_flask import JDMBlueprint, success, error
from app.core.convenience.plugin_table import PluginsTable
from app.manager.supabase import SupabaseManager


class SupabaseBlueprint(JDMBlueprint):
    def __init__(self):
        super().__init__("supabase", __name__)

    @JDMBlueprint.get("/plugins", auth=False)
    def get_plugins():
        try:
            approved_only = request.args.get("all", "false").lower() != "true"
            plugins = PluginsTable.all(approved_only=approved_only)
            return success(plugins, f"{len(plugins)} plugin(s) found")
        except Exception as exc:
            return error(str(exc), status=500)

    @JDMBlueprint.get("/plugins/<namespace>", auth=False)
    def get_plugin(namespace: str):
        try:
            plugin = PluginsTable.by_namespace(namespace)
            if not plugin:
                return error(f"Plugin '{namespace}' not found", status=404)
            return success(plugin)
        except Exception as exc:
            return error(str(exc), status=500)

    @JDMBlueprint.post(
        "/plugins",
        auth=True,
        validate=["namespace", "package", "description"],
    )
    def create_plugin():
        try:
            body = request.get_json(force=True)
            data = {
                "namespace":   body["namespace"],
                "package":     body["package"],
                "description": body["description"],
                "commands":    json.dumps(body.get("commands", [])),
                "is_official": False,
                "approved":    False,
            }
            created = PluginsTable.create(data)
            return success(created, "Plugin submitted successfully", status=201)
        except Exception as exc:
            return error(str(exc), status=500)

    @JDMBlueprint.put("/plugins/<namespace>", auth=True)
    def update_plugin(namespace: str):
        try:
            body = request.get_json(force=True)
            body.pop("is_official", None)
            body.pop("approved", None)
            body.pop("submitted_by", None)

            if "commands" in body:
                body["commands"] = json.dumps(body["commands"])

            updated = SupabaseManager.update_row(
                "plugins",
                filters={"namespace": namespace},
                data=body,
            )
            if not updated:
                return error(f"Plugin '{namespace}' not found", status=404)
            return success(updated, "Plugin updated")
        except Exception as exc:
            return error(str(exc), status=500)

    @JDMBlueprint.delete("/plugins/<namespace>", auth=True)
    def delete_plugin(namespace: str):
        try:
            deleted = PluginsTable.delete_all_versions(namespace)
            if not deleted:
                return error(f"Plugin '{namespace}' not found", status=404)
            return success(deleted, f"Plugin '{namespace}' deleted")
        except Exception as exc:
            return error(str(exc), status=500)

    @JDMBlueprint.get("/table/<table_name>", auth=True)
    def query_table(table_name: str):
        RESERVED = {"order", "limit", "columns"}
        try:
            filters = {k: v for k, v in request.args.items() if k not in RESERVED}
            order   = request.args.get("order")
            limit   = int(request.args.get("limit", 100))
            columns = request.args.get("columns", "*")

            rows = SupabaseManager.fetch_all(
                table_name,
                filters=filters or None,
                columns=columns,
                order=order,
                limit=limit,
            )
            return success(rows, f"{len(rows)} row(s) from '{table_name}'")
        except Exception as exc:
            return error(str(exc), status=500)