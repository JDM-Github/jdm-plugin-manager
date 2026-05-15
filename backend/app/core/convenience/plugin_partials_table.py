from app.manager.supabase import SupabaseManager


class PluginPartialsTable:
    TABLE = "plugin_partials"

    @staticmethod
    def by_owner(submitted_by: str) -> list[dict]:
        return SupabaseManager.fetch_all(
            PluginPartialsTable.TABLE,
            filters={"submitted_by": submitted_by},
            order="created_at",
        )

    @staticmethod
    def by_namespace(namespace: str) -> dict | None:
        return SupabaseManager.fetch_one(
            PluginPartialsTable.TABLE,
            filters={"namespace": namespace},
        )

    @staticmethod
    def by_namespace_and_owner(namespace: str, submitted_by: str) -> dict | None:
        return SupabaseManager.fetch_one(
            PluginPartialsTable.TABLE,
            filters={"namespace": namespace, "submitted_by": submitted_by},
        )

    @staticmethod
    def by_package(package: str) -> dict | None:
        return SupabaseManager.fetch_one(
            PluginPartialsTable.TABLE,
            filters={"package": package},
        )

    @staticmethod
    def create(data: dict) -> dict:
        return SupabaseManager.insert_row(PluginPartialsTable.TABLE, data)

    @staticmethod
    def update(namespace: str, data: dict) -> dict | None:
        return SupabaseManager.update_row(
            PluginPartialsTable.TABLE,
            filters={"namespace": namespace},
            data=data,
        )

    @staticmethod
    def delete(namespace: str) -> list[dict]:
        return SupabaseManager.delete_row(
            PluginPartialsTable.TABLE,
            filters={"namespace": namespace},
        )