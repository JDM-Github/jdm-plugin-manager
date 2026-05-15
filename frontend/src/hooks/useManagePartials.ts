// ─── useManagePartials.ts ─────────────────────────────────────
import { useState, useCallback } from "react";
import type { PluginPartial } from "../lib/types";
import { useAuth } from "../lib/context/auth_context";
import RequestHandler from "../lib/utilities/request_handler";

type PendingAction = "link" | "unlink" | "push" | "delete" | "install";

export function useManagePartials() {
    const { user } = useAuth();

    const [partials, setPartials] = useState<PluginPartial[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<Map<string, PendingAction>>(new Map());

    // ── Helpers ──────────────────────────────────────────────

    const authHeader = (): Record<string, string> => ({
        "X-Username": user?.username ?? "",
    });

    const setPend = (ns: string, action: PendingAction) =>
        setPending(m => new Map(m).set(ns, action));

    const clearPend = (ns: string) =>
        setPending(m => { const n = new Map(m); n.delete(ns); return n; });

    /**
     * Normalise a raw partial from the API.
     * The backend injects `description` and `commands` (from package.json)
     * on GET /partials, POST /partials/.../link, and DELETE .../link,
     * so they are always present in successful responses.
     */
    const normalise = (raw: any): PluginPartial => ({
        id: raw.id ?? "",
        namespace: raw.namespace ?? "",
        package: raw.package ?? "",
        version: raw.version ?? "1.0.0",
        link_path: raw.linkPath ?? "",
        submitted_by: raw.submitted_by ?? "",
        created_at: raw.created_at ?? new Date().toISOString(),
        description: raw.description ?? "",
        commands: Array.isArray(raw.commands)
            ? raw.commands
            : (typeof raw.commands === "string"
                ? JSON.parse(raw.commands)
                : []),
    });

    const installed = useCallback(async (namespace: string, localPath: string): Promise<void> => {
        setPend(namespace, "install");
        const res = await RequestHandler.fetchData("POST", "plugin/link_anonymous", { localPath });
        if (!res.success) throw new Error(res.message ?? "Failed to link package");
        clearPend(namespace);
    }, []);

    // ── Load ─────────────────────────────────────────────────
    // GET /manage/partials
    // Backend reads each linked package.json and injects
    // description + commands so the UI can show them without
    // any extra requests.
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await RequestHandler.fetchData(
            "GET", "manage/partials", {}, authHeader(),
        );
        if (res?.success) {
            console.log(res.data);
            setPartials((res.data as any[]).map(normalise));
        } else {
            setError(res?.message ?? "Failed to load partials");
        }
        setLoading(false);
    }, [user]);

    // ── Create ───────────────────────────────────────────────

    const create = useCallback(async (
        namespace: string,
        pkg: string,
        version: string = "1.0.0",
    ): Promise<void> => {
        const res = await RequestHandler.fetchData(
            "POST", "manage/partials",
            { namespace, package: pkg, version },
            authHeader(),
        );
        if (!res?.success) throw new Error(res?.message ?? "Failed to create partial");
        setPartials(ps => [...ps, normalise(res.data)]);
    }, [user]);

    // ── Update ───────────────────────────────────────────────

    const update = useCallback(async (
        namespace: string,
        fields: { namespace?: string; package?: string; version?: string },
    ): Promise<void> => {
        const res = await RequestHandler.fetchData(
            "PUT", `manage/partials/${namespace}`,
            fields,
            authHeader(),
        );
        if (!res?.success) throw new Error(res?.message ?? "Failed to update partial");
        const updated = normalise(res.data);
        setPartials(ps => ps.map(p => p.namespace === namespace ? updated : p));
    }, [user]);

    // ── Delete ───────────────────────────────────────────────

    const remove = useCallback(async (namespace: string): Promise<void> => {
        setPend(namespace, "delete");
        const res = await RequestHandler.fetchData(
            "DELETE", `manage/partials/${namespace}`, {}, authHeader(),
        );
        clearPend(namespace);
        if (!res?.success) throw new Error(res?.message ?? "Failed to delete partial");
        setPartials(ps => ps.filter(p => p.namespace !== namespace));
    }, [user]);

    // ── Link ─────────────────────────────────────────────────
    // POST /manage/partials/<namespace>/link
    //
    // The backend:
    //   1. Validates package.json["name"] === partial.package
    //   2. Validates jdmPlugin.namespace === namespace
    //   3. Syncs version from package.json → partial.version in DB
    //   4. Returns the updated partial + description + commands
    //
    // No need to send package_name separately anymore — the backend
    // reads the name directly from the file at link_path.

    const link = useCallback(async (
        namespace: string,
        linkPath: string,
    ): Promise<void> => {
        setPend(namespace, "link");
        const res = await RequestHandler.fetchData(
            "POST", `manage/partials/${namespace}/link`,
            { link_path: linkPath },
            authHeader(),
        );
        clearPend(namespace);
        if (!res?.success) throw new Error(res?.message ?? "Failed to link partial");
        // Backend returns partial row + description + commands from package.json
        setPartials(ps => ps.map(p =>
            p.namespace === namespace ? normalise(res.data) : p
        ));
    }, [user]);

    // ── Unlink ───────────────────────────────────────────────

    const unlink = useCallback(async (namespace: string): Promise<void> => {
        setPend(namespace, "unlink");
        const res = await RequestHandler.fetchData(
            "DELETE", `manage/partials/${namespace}/link`, {}, authHeader(),
        );
        clearPend(namespace);
        if (!res?.success) throw new Error(res?.message ?? "Failed to unlink partial");
        // Backend returns partial with linkPath cleared; description/commands reset to ""
        setPartials(ps => ps.map(p =>
            p.namespace === namespace ? normalise(res.data) : p
        ));
    }, [user]);

    // ── Push ─────────────────────────────────────────────────
    // The backend now re-reads package.json at push time, so the
    // frontend no longer needs to send description/commands — they
    // come straight from disk, guaranteeing freshness.
    const push = useCallback(async (namespace: string): Promise<void> => {
        const partial = partials.find(p => p.namespace === namespace);
        if (!partial) throw new Error("Partial not found");
        if (!partial.link_path) throw new Error("Partial must be linked before pushing");

        setPend(namespace, "push");
        const res = await RequestHandler.fetchData(
            "POST", `manage/partials/${namespace}/push`,
            {},
            authHeader(),
        );
        clearPend(namespace);
        if (!res?.success) throw new Error(res?.message ?? "Failed to push partial");
    }, [partials, user]);

    // ── Dismiss error ─────────────────────────────────────────

    const dismissError = useCallback(() => setError(null), []);

    return {
        partials,
        loading,
        error,
        pending,
        load,
        create,
        update,
        remove,
        link,
        unlink,
        push,
        dismissError,
        installed
    };
}