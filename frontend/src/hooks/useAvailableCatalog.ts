import { useState, useCallback, useEffect } from "react";
import type { AvailablePlugin } from "../lib/types";
import RequestHandler from "../lib/utilities/request_handler";
import { getCached, setCache, clearCache } from "./usePluginCache";
import { useAuth } from "../lib/context/auth_context";

type PendingAction = "install" | "remove" | "link";

export function useAvailableCatalog() {
    const { user } = useAuth();
    const [plugins, setPlugins] = useState<AvailablePlugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloading, setReloading] = useState(false);
    const [cachedAt, setCachedAt] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<Set<string>>(new Set());
    const [pendingAction, setPendingAction] = useState<Map<string, PendingAction>>(new Map());

    // ── Pending helpers ───────────────────────────────────────

    const addPending = useCallback((ns: string, action: PendingAction) => {
        setPending(p => new Set(p).add(ns));
        setPendingAction(m => new Map(m).set(ns, action));
    }, []);

    const removePending = useCallback((ns: string) => {
        setPending(p => { const n = new Set(p); n.delete(ns); return n; });
        setPendingAction(m => { const n = new Map(m); n.delete(ns); return n; });
    }, []);

    // ── Load ──────────────────────────────────────────────────

    const loadPlugins = useCallback(async (force = false) => {
        force ? setReloading(true) : setLoading(true);
        setError(null);

        if (force) await clearCache();

        if (!force) {
            const cached = await getCached();
            if (cached) {
                setPlugins(cached.plugins);
                setCachedAt(cached.cachedAt);
                setLoading(false);
                return;
            }
        }

        try {
            const npmUsername = user?.type === "npm" ? user.username : null;
            const res = await RequestHandler.fetchData(
                "GET",
                "plugin/available",
                {},
                npmUsername ? { "X-Username": npmUsername } : {},
            );
            if (!res.success) throw new Error(res.message ?? "Failed to load catalog");

            const fresh = (res.data.plugins as AvailablePlugin[]).map(p => ({
                ...p,
                commands: typeof p.commands === "string" ? JSON.parse(p.commands) : p.commands,
            }));

            setPlugins(fresh);
            setCachedAt(Date.now());
            await setCache(fresh);
        } catch (err: any) {
            setError(err.message ?? "Failed to load available plugins");
        } finally {
            setLoading(false);
            setReloading(false);
        }
    }, [user]);

    useEffect(() => { loadPlugins(); }, [loadPlugins]);

    // ── Actions ───────────────────────────────────────────────

    const install = useCallback(async (pkg: string): Promise<void> => {
        const target = plugins.find(p => p.package === pkg);
        if (!target) return;

        addPending(target.namespace, "install");
        try {
            const res = await RequestHandler.fetchData("POST", "plugin/install", { package: pkg });
            if (!res.success) throw new Error(res.message ?? `Failed to install ${pkg}`);

            setPlugins(prev =>
                prev.map(p =>
                    p.package === pkg
                        ? { ...p, installed: true, installedVersion: res.data.version ?? null }
                        : p
                )
            );
        } finally {
            removePending(target.namespace);
        }
    }, [plugins, addPending, removePending]);

    const remove = useCallback(async (namespace: string): Promise<void> => {
        const target = plugins.find(p => p.namespace === namespace);
        if (!target) return;

        addPending(namespace, "remove");
        try {
            const res = await RequestHandler.fetchData("POST", `plugin/delete/${namespace}`);
            if (!res.success) throw new Error(res.message ?? `Failed to remove ${target.package}`);

            const updated = plugins.map(p =>
                p.namespace === namespace
                    ? { ...p, installed: false, installedVersion: null }
                    : p
            );
            setPlugins(updated);
            setCachedAt(Date.now());
            await setCache(updated);
        } finally {
            removePending(namespace);
        }
    }, [plugins, addPending, removePending]);

    const link = useCallback(async (pkg: string, localPath: string): Promise<void> => {
        const target = plugins.find(p => p.package === pkg);
        if (!target) return;

        addPending(target.namespace, "link");
        try {
            const res = await RequestHandler.fetchData("POST", "plugin/link", {
                package: pkg,
                localPath,
            });
            if (!res.success) throw new Error(res.message ?? `Failed to link ${pkg}`);

            const updated = plugins.map(p =>
                p.package === pkg
                    ? { ...p, installed: true, installedVersion: res.data.version ?? null, linked: true, localPath }
                    : p
            );
            setPlugins(updated);
            setCachedAt(Date.now());
            await setCache(updated);
        } finally {
            removePending(target.namespace);
        }
    }, [plugins, addPending, removePending]);

    const linkAnonymous = useCallback(async (localPath: string): Promise<void> => {
        const res = await RequestHandler.fetchData("POST", "plugin/link_anonymous", { localPath });
        if (!res.success) throw new Error(res.message ?? "Failed to link package");
        await loadPlugins(true);
    }, [loadPlugins]);

    // ── Derived ───────────────────────────────────────────────

    const cacheAge = cachedAt
        ? (() => {
            const mins = Math.floor((Date.now() - cachedAt) / 60_000);
            return mins < 1 ? "just now" : `${mins}m ago`;
        })()
        : null;

    return {
        plugins,
        loading,
        reloading,
        cacheAge,
        error,
        dismissError: () => setError(null),
        pending,
        pendingAction,
        loadPlugins,
        install,
        remove,
        link,
        linkAnonymous,
    };
}