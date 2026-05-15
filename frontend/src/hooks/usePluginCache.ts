import type { AvailablePlugin } from "../lib/types";

const CACHE_KEY = "available_plugins_cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
    plugins: AvailablePlugin[];
    cachedAt: number;
}

// ── Detect Electron ──────────────────────────────────────────────────────────

function isElectron(): boolean {
    return typeof window !== "undefined" &&
        typeof (window as any).electronAPI?.cache !== "undefined";
}

const electronCache = {
    async get(): Promise<CacheEntry | null> {
        try {
            const entry = await (window as any).electronAPI.cache.get(CACHE_KEY) as CacheEntry | null;
            if (!entry || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
            return entry;
        } catch {
            return null;
        }
    },

    async set(plugins: AvailablePlugin[]): Promise<void> {
        try {
            await (window as any).electronAPI.cache.set(CACHE_KEY, {
                plugins,
                cachedAt: Date.now(),
            } satisfies CacheEntry);
        } catch { /* silently fail */ }
    },

    async clear(): Promise<void> {
        try {
            await (window as any).electronAPI.cache.delete(CACHE_KEY);
        } catch { /* silently fail */ }
    },
};

// ── Browser: IndexedDB cache (unchanged) ────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("jdm_plugin_cache", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("cache");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

const idbCache = {
    async get(): Promise<CacheEntry | null> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction("cache", "readonly");
                const req = tx.objectStore("cache").get(CACHE_KEY);
                req.onsuccess = () => {
                    const entry = req.result as CacheEntry | undefined;
                    if (!entry || Date.now() - entry.cachedAt > CACHE_TTL_MS) return resolve(null);
                    resolve(entry);
                };
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    },

    async set(plugins: AvailablePlugin[]): Promise<void> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction("cache", "readwrite");
                tx.objectStore("cache").put(
                    { plugins, cachedAt: Date.now() } satisfies CacheEntry,
                    CACHE_KEY
                );
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch { /* silently fail */ }
    },

    async clear(): Promise<void> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction("cache", "readwrite");
                tx.objectStore("cache").delete(CACHE_KEY);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch { /* silently fail */ }
    },
};

// ── Public API (same signatures as before) ───────────────────────────────────

const adapter = isElectron() ? electronCache : idbCache;

export async function getCached(): Promise<CacheEntry | null> {
    return adapter.get();
}

export async function setCache(plugins: AvailablePlugin[]): Promise<void> {
    return adapter.set(plugins);
}

export async function clearCache(): Promise<void> {
    return adapter.clear();
}