import { useState, useEffect, useCallback } from "react";
import RequestHandler from "../lib/utilities/request_handler";

// ── Types ─────────────────────────────────────────────────────

export interface DashboardStats {
    installed: number;
    linked: number;
    updates: number;
    catalog: number;
    partials: number;
}

export interface DashboardPlugin {
    package: string;
    version: string;
    latestVersion: string;
    namespace: string;
    description: string;
    commands: string[];
    linked: boolean;
    localPath: string | null;
    installedAt: string;
}

export interface RecentPlugin {
    namespace: string;
    package: string;
    version: string;
    submitted_by: string;
    is_official: boolean;
    created_at: string;
}

export interface TopCommand {
    command: string;
    count: number;
}

export interface DashboardData {
    stats: DashboardStats;
    installed: DashboardPlugin[];
    recent_plugins: RecentPlugin[];
    top_commands: TopCommand[];
}

// ── Hook ──────────────────────────────────────────────────────

export function useDashboardCatalog() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await RequestHandler.fetchData("GET", "manage/dashboard");
            if (!res.success) throw new Error(res.message ?? "Failed to load dashboard");
            setData(res.data as DashboardData);
        } catch (err: any) {
            setError(err.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Derived helpers
    const updatesAvailable = data
        ? data.installed.filter(
            p => !p.linked && p.latestVersion && p.version !== p.latestVersion
        )
        : [];

    const linkedPlugins = data
        ? data.installed.filter(p => p.linked)
        : [];

    return {
        data,
        loading,
        error,
        reload: load,
        updatesAvailable,
        linkedPlugins,
    };
}