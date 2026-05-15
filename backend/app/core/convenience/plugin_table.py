from app.manager.supabase import SupabaseManager


class PluginsTable:
    TABLE = "plugins"

    @staticmethod
    def all(approved_only: bool = True) -> list[dict]:
        all_rows = SupabaseManager.fetch_all(
            PluginsTable.TABLE,
            filters={"approved": True} if approved_only else None,
            order="-created_at",
        )
        return PluginsTable._latest_per_namespace(all_rows)

    @staticmethod
    def by_namespace(namespace: str) -> dict | None:
        rows = SupabaseManager.fetch_all(
            PluginsTable.TABLE,
            filters={"namespace": namespace},
            order="-created_at",
        )
        return rows[0] if rows else None

    @staticmethod
    def by_package(package: str) -> dict | None:
        rows = SupabaseManager.fetch_all(
            PluginsTable.TABLE,
            filters={"package": package},
            order="-created_at",
        )
        return rows[0] if rows else None

    @staticmethod
    def all_versions(namespace: str) -> list[dict]:
        return SupabaseManager.fetch_all(
            PluginsTable.TABLE,
            filters={"namespace": namespace},
            order="-created_at",
        )

    @staticmethod
    def by_owner(submitted_by: str) -> list[dict]:
        rows = SupabaseManager.fetch_all(
            PluginsTable.TABLE,
            filters={"submitted_by": submitted_by},
            order="-created_at",
        )
        return PluginsTable._latest_per_namespace(rows)

    @staticmethod
    def by_namespace_and_owner(namespace: str, submitted_by: str) -> dict | None:
        rows = SupabaseManager.fetch_all(
            PluginsTable.TABLE,
            filters={"namespace": namespace, "submitted_by": submitted_by},
            order="-created_at",
            limit=1,
        )
        return rows[0] if rows else None

    @staticmethod
    def create(data: dict) -> dict:
        return SupabaseManager.insert_row(PluginsTable.TABLE, data)

    @staticmethod
    def delete_all_versions(namespace: str) -> list[dict]:
        return SupabaseManager.delete_row(
            PluginsTable.TABLE,
            filters={"namespace": namespace},
        )

    @staticmethod
    def _latest_per_namespace(rows: list[dict]) -> list[dict]:
        seen: set[str] = set()
        result: list[dict] = []
        for row in rows:
            ns = row["namespace"]
            if ns not in seen:
                seen.add(ns)
                result.append(row)
        return result