// hooks/usePersistedStore.ts
import { useState, useEffect, useRef } from "react";
import { dbGet, dbSet } from "../lib/db";
import type { TabStore } from "../lib/types";
import { createTab } from "../lib/utils";

const STORE_KEY = (namespace: string) => `runner_tabs:${namespace}`;

function sanitizeStore(parsed: any): TabStore {
    return {
        activeTabId: parsed.activeTabId,
        tabs: parsed.tabs.map((t: any) => ({
            ...createTab(1),
            id: t.id,
            label: t.label,
            workDir: t.workDir ?? "",
            activeCommand: t.activeCommand ?? null,
            fieldValues: t.fieldValues ?? {},
            logs: t.logs ?? [],
            running: false,
            done: t.done ?? false,
            exitOk: t.exitOk ?? false,
            prompt: null,
            promptInput: "",
        })),
    };
}

export function usePersistedStore(namespace: string) {
    const [store, setStore] = useState<TabStore | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestStore = useRef<TabStore | null>(null);

    useEffect(() => {
        setStore(null);
        dbGet<any>(STORE_KEY(namespace)).then(saved => {
            if (saved) {
                try {
                    setStore(sanitizeStore(saved));
                    return;
                } catch { }
            }
            const first = createTab(1);
            setStore({ tabs: [first], activeTabId: first.id });
        });
    }, [namespace]);

    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            if (latestStore.current) {
                const s = latestStore.current;
                const toSave = {
                    activeTabId: s.activeTabId,
                    tabs: s.tabs.map(t => ({
                        id: t.id,
                        label: t.label,
                        workDir: t.workDir,
                        activeCommand: t.activeCommand,
                        fieldValues: t.fieldValues,
                        logs: t.logs,
                    })),
                };
                dbSet(STORE_KEY(namespace), toSave).catch(console.error);
            }
        };
    }, [namespace]);

    const persistedSetStore = (updater: (prev: TabStore) => TabStore) => {
        setStore(prev => {
            if (!prev) return prev;
            const next = updater(prev);
            latestStore.current = next;

            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                const toSave = {
                    activeTabId: next.activeTabId,
                    tabs: next.tabs.map(t => ({
                        id: t.id,
                        label: t.label,
                        workDir: t.workDir,
                        activeCommand: t.activeCommand,
                        fieldValues: t.fieldValues,
                        logs: t.logs,
                        done: t.done,
                        exitOk: t.exitOk,
                    })),
                };
                dbSet(STORE_KEY(namespace), toSave).catch(console.error);
            }, 300);

            return next;
        });
    };

    return { store, setStore: persistedSetStore };
}