// ─── useManagePlugins.ts ──────────────────────────────────────
import { useState, useCallback } from "react";
import type { ManagedPlugin } from "../lib/types";
import { useAuth } from "../lib/context/auth_context";
import RequestHandler from "../lib/utilities/request_handler";

export function useManagePlugins() {
    const { user } = useAuth();

    const [plugins, setPlugins] = useState<ManagedPlugin[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());

    // ── Helpers ──────────────────────────────────────────────

    const authHeader = (): Record<string, string> => ({
        "X-Username": user?.username ?? "",
    });

    const normalise = (raw: any): ManagedPlugin => ({
        id: raw.id ?? "",
        namespace: raw.namespace ?? "",
        package: raw.package ?? "",
        version: raw.version ?? "1.0.0",
        description: raw.description ?? "",
        commands: Array.isArray(raw.commands)
            ? raw.commands
            : (typeof raw.commands === "string"
                ? JSON.parse(raw.commands)
                : []),
        is_official: raw.is_official ?? false,
        approved: raw.approved ?? null,
        submitted_by: raw.submitted_by ?? "",
        created_at: raw.created_at ?? new Date().toISOString(),
    });

    // ── Load ─────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await RequestHandler.fetchData(
            "GET", "manage/plugins", {}, authHeader(),
        );
        if (res?.success) {
            setPlugins((res.data as any[]).map(normalise));
        } else {
            setError(res?.message ?? "Failed to load plugins");
        }
        setLoading(false);
    }, [user]);

    // ── Reload (called after a successful push from partials) ─

    const reload = useCallback(async () => {
        const res = await RequestHandler.fetchData(
            "GET", "manage/plugins", {}, authHeader(),
        );
        if (res?.success) {
            setPlugins((res.data as any[]).map(normalise));
        }
    }, [user]);

    // ── Delete (removes all version rows for namespace) ───────

    const remove = useCallback(async (namespace: string): Promise<void> => {
        setPendingDelete(s => new Set(s).add(namespace));
        const res = await RequestHandler.fetchData(
            "DELETE", `manage/plugins/${namespace}`, {}, authHeader(),
        );
        setPendingDelete(s => { const n = new Set(s); n.delete(namespace); return n; });
        if (!res?.success) throw new Error(res?.message ?? "Failed to delete plugin");
        setPlugins(ps => ps.filter(p => p.namespace !== namespace));
    }, [user]);

    // ── Dismiss error ─────────────────────────────────────────

    const dismissError = useCallback(() => setError(null), []);

    return {
        plugins,
        loading,
        error,
        pendingDelete,
        load,
        reload,
        remove,
        dismissError,
    };
}