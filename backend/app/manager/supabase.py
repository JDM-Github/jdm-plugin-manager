from typing import Any
import requests
from app.config import AppConfig


class SupabaseManager:

    @classmethod
    def _get_headers(cls) -> dict:
        url = AppConfig.SUPABASE_URL.strip().rstrip("/")
        key = AppConfig.SUPABASE_KEY.strip()
        if not url or not key:
            missing = [name for name, val in [("SUPABASE_URL", url), ("SUPABASE_KEY", key)] if not val]
            raise EnvironmentError(
                f"Missing Supabase environment variable(s): {', '.join(missing)}"
            )
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    @classmethod
    def _get_url(cls, table: str) -> str:
        return f"{AppConfig.SUPABASE_URL.strip().rstrip('/')}/rest/v1/{table}"

    @classmethod
    def fetch_all(
        cls,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        columns: str = "*",
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        params = {"select": columns}

        if filters:
            for col, val in filters.items():
                params[col] = f"eq.{val}"

        if order:
            descending = order.startswith("-")
            col = order.lstrip("-")
            params["order"] = f"{col}.{'desc' if descending else 'asc'}"

        if limit is not None:
            params["limit"] = limit

        try:
            res = requests.get(cls._get_url(table), headers=cls._get_headers(), params=params)
            res.raise_for_status()
            return res.json() or []
        except Exception as exc:
            raise RuntimeError(f"fetch_all({table}) failed: {exc}") from exc

    @classmethod
    def fetch_one(
        cls,
        table: str,
        *,
        filters: dict[str, Any],
        columns: str = "*",
    ) -> dict | None:
        rows = cls.fetch_all(table, filters=filters, columns=columns, limit=1)
        return rows[0] if rows else None

    @classmethod
    def insert_row(cls, table: str, data: dict[str, Any]) -> dict:
        try:
            res = requests.post(
                cls._get_url(table),
                headers={**cls._get_headers(), "Prefer": "return=representation"},
                json=data,
            )
            res.raise_for_status()
            result = res.json()
            if not result:
                raise RuntimeError("Insert returned no data")
            return result[0]
        except Exception as exc:
            raise RuntimeError(f"insert_row({table}) failed: {exc}") from exc

    @classmethod
    def update_row(
        cls,
        table: str,
        *,
        filters: dict[str, Any],
        data: dict[str, Any],
    ) -> dict | None:
        params = {col: f"eq.{val}" for col, val in filters.items()}
        try:
            res = requests.patch(
                cls._get_url(table),
                headers={**cls._get_headers(), "Prefer": "return=representation"},
                params=params,
                json=data,
            )
            res.raise_for_status()
            result = res.json()
            return result[0] if result else None
        except Exception as exc:
            raise RuntimeError(f"update_row({table}) failed: {exc}") from exc

    @classmethod
    def delete_row(
        cls,
        table: str,
        *,
        filters: dict[str, Any],
    ) -> list[dict]:
        params = {col: f"eq.{val}" for col, val in filters.items()}
        try:
            res = requests.delete(
                cls._get_url(table),
                headers={**cls._get_headers(), "Prefer": "return=representation"},
                params=params,
            )
            res.raise_for_status()
            return res.json() or []
        except Exception as exc:
            raise RuntimeError(f"delete_row({table}) failed: {exc}") from exc