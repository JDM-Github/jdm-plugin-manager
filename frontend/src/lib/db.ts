// lib/db.ts

// ── Electron detection ────────────────────────────────────────
// window.electronAPI is injected by preload.js via contextBridge.
// When present, use the IPC-backed file cache (port-independent).
// In browser dev, fall back to IndexedDB.

function isElectron(): boolean {
    return typeof window !== "undefined" && !!window.electronAPI?.cache;
}

async function electronGet<T>(key: string): Promise<T | null> {
    const result = await window.electronAPI!.cache.get(key);
    return result ?? null;
}

async function electronSet(key: string, value: any): Promise<void> {
    await window.electronAPI!.cache.set(key, value);
}

async function electronDelete(key: string): Promise<void> {
    await window.electronAPI!.cache.delete(key);
}

// ── IndexedDB fallback (browser dev) ─────────────────────────

const DB_NAME = "runner_db";
const DB_VERSION = 1;
const STORE = "runner_store";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet<T>(key: string): Promise<T | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

async function idbSet(key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function idbDelete(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ── Public API ────────────────────────────────────────────────

export async function dbGet<T>(key: string): Promise<T | null> {
    return isElectron() ? electronGet<T>(key) : idbGet<T>(key);
}

export async function dbSet(key: string, value: any): Promise<void> {
    return isElectron() ? electronSet(key, value) : idbSet(key, value);
}

export async function dbDelete(key: string): Promise<void> {
    return isElectron() ? electronDelete(key) : idbDelete(key);
}