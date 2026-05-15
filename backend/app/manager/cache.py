import json
import os
import time
from pathlib import Path
from typing import Any, Callable, Optional, TypeVar

T = TypeVar("T")

_DEFAULT_CACHE_DIR = Path(os.path.expanduser("~")) / ".jdm" / "cache"
_DEFAULT_TTL = 86400  # 24 hours


class CacheManager:
    _cache_dir: Path = _DEFAULT_CACHE_DIR
    _default_ttl: int = _DEFAULT_TTL

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _ensure_dir(cls) -> None:
        cls._cache_dir.mkdir(parents=True, exist_ok=True)

    @classmethod
    def _path(cls, key: str) -> Path:
        safe_key = key.replace("/", "_").replace("\\", "_").replace(":", "_")
        return cls._cache_dir / f"{safe_key}.json"

    @classmethod
    def _read(cls, key: str) -> Optional[dict]:
        path = cls._path(key)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    @classmethod
    def _write(cls, key: str, payload: dict) -> None:
        cls._ensure_dir()
        cls._path(key).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------

    @classmethod
    def configure(
        cls,
        cache_dir: Optional[Path] = None,
        default_ttl: Optional[int] = None,
    ) -> None:
        """
        Override defaults before first use.

            CacheManager.configure(
                cache_dir=Path("/tmp/my_app/cache"),
                default_ttl=3600,
            )
        """
        if cache_dir is not None:
            cls._cache_dir = cache_dir
        if default_ttl is not None:
            cls._default_ttl = default_ttl

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def get(cls, key: str, ttl: Optional[int] = None) -> Optional[Any]:
        """
        Return cached value for key if it exists and hasn't expired.
        Returns None on miss or expiry.
        """
        data = cls._read(key)
        if data is None:
            return None

        effective_ttl = ttl if ttl is not None else cls._default_ttl
        if time.time() - data.get("cachedAt", 0) >= effective_ttl:
            return None

        return data.get("value")

    @classmethod
    def set(cls, key: str, value: Any) -> None:
        """Persist value under key with the current timestamp."""
        cls._write(key, {"cachedAt": time.time(), "value": value})

    @classmethod
    def get_or_fetch(
        cls,
        key: str,
        fetch_fn: Callable[[], T],
        ttl: Optional[int] = None,
        force: bool = False,
    ) -> T:
        """
        Return cached value if fresh, otherwise call fetch_fn(), cache, and return.
        """
        if not force:
            cached = cls.get(key, ttl=ttl)
            if cached is not None:
                return cached

        value = fetch_fn()
        cls.set(key, value)
        return value

    @classmethod
    async def get_or_fetch_async(
        cls,
        key: str,
        fetch_fn: Callable,
        ttl: Optional[int] = None,
        force: bool = False,
    ) -> Any:
        """
        Async variant of get_or_fetch for async fetch functions.
        """
        if not force:
            cached = cls.get(key, ttl=ttl)
            if cached is not None:
                return cached

        value = await fetch_fn()
        cls.set(key, value)
        return value

    @classmethod
    def invalidate(cls, key: str) -> bool:
        """Delete a single cache entry. Returns True if it existed."""
        path = cls._path(key)
        if path.exists():
            path.unlink()
            return True
        return False

    @classmethod
    def invalidate_all(cls) -> int:
        """Delete all cache entries. Returns the count of deleted files."""
        count = 0
        for f in cls._cache_dir.glob("*.json"):
            f.unlink()
            count += 1
        return count

    @classmethod
    def is_fresh(cls, key: str, ttl: Optional[int] = None) -> bool:
        """Return True if key exists and hasn't expired yet."""
        return cls.get(key, ttl=ttl) is not None

    @classmethod
    def age(cls, key: str) -> Optional[float]:
        """Return how many seconds old the cache entry is, or None if missing."""
        data = cls._read(key)
        if data is None:
            return None
        return time.time() - data.get("cachedAt", 0)