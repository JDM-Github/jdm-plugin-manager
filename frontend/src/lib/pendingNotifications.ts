const DB_NAME = "jdm_runner_db";
const DB_VERSION = 1;
const STORE = "running_tabs";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export interface RunningTabMeta {
    label: string;
    namespace: string;
}

export async function saveRunningTab(tabId: string, meta: RunningTabMeta): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(meta, tabId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch { }
}

export async function getRunningTab(tabId: string): Promise<RunningTabMeta | null> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, "readonly");
            const req = tx.objectStore(STORE).get(tabId);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

export async function deleteRunningTab(tabId: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).delete(tabId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch { }
}