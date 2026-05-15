// ─── Plugins.tsx ──────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PluginCard } from "../components/plugins/PluginCard";
import { FilterTabs } from "../components/plugins/FilterTabs";
import { ConfirmModal } from "../components/plugins/ConfirmModal";
import { MOTION_CONTAINER } from "../lib/constant";
import type { Plugin, PluginCommand, PluginStatus } from "../lib/types";
import RequestHandler from "../lib/utilities/request_handler";
import { clearCache } from "../hooks/usePluginCache";

type Filter = "all" | "update-available";
type ModalState = { plugin: string; action: "remove" | "update" } | null;

interface RawPlugin {
    package: string;
    version: string;
    latestVersion: string;
    namespace: string;
    description: string;
    commands: PluginCommand[];
    linked: boolean;
    localPath: string | null;
    installedAt: string;
}

// ─────────────────────────────────────────────────────────────
//  Mapping
// ─────────────────────────────────────────────────────────────

function compareVersions(version1: string, version2: string): number {
    const v1 = version1.replace(/^v/, '');
    const v2 = version2.replace(/^v/, '');

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

function toPlugin(raw: RawPlugin): Plugin {
    let status: PluginStatus = "up-to-date";
    if (raw.linked) {
        const versionComparison = compareVersions(raw.version, raw.latestVersion);
        if (versionComparison > 0) {
            status = "higher-version";
        } else if (versionComparison < 0) {
            status = "update-available";
        } else {
            status = "up-to-date";
        }
    }
    return {
        name: raw.package,
        namespace: raw.namespace,
        version: raw.version,
        description: raw.description,
        commands: raw.commands,
        linked: raw.linked,
        localPath: raw.localPath,
        installedAt: raw.installedAt,
        latestVersion: raw.latestVersion,
        status
    };
}

// ─────────────────────────────────────────────────────────────
//  API calls
// ─────────────────────────────────────────────────────────────

async function fetchInstalled(): Promise<RawPlugin[]> {
    const res = await RequestHandler.fetchData("GET", "plugin/get-all");
    if (!res.success) throw new Error(res.message ?? "Failed to load plugins");
    return Object.values(res.data.plugins) as RawPlugin[];
}

// ─────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────

export default function Plugins() {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalState>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [pending, setPending] = useState<Set<string>>(new Set());

    // ── Load ──────────────────────────────────────────────────
    const loadPlugins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const raws = await fetchInstalled();
            setPlugins(raws.map(toPlugin));
        } catch (err: any) {
            setError(err.message ?? "Failed to load plugins");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPlugins(); }, [loadPlugins]);

    // ── Derived ───────────────────────────────────────────────
    const updateCount = plugins.filter(p => p.status === "update-available").length;
    const filtered = filter === "all"
        ? plugins
        : plugins.filter(p => p.status === filter);

    // ── Pending helpers ───────────────────────────────────────
    const addPending = (ns: string) => setPending(p => new Set(p).add(ns));
    const removePending = (ns: string) => setPending(p => { const n = new Set(p); n.delete(ns); return n; });

    // ── Handlers ──────────────────────────────────────────────
    const handleRemove = (name: string) => setModal({ plugin: name, action: "remove" });
    const handleUpdate = (name: string) => setModal({ plugin: name, action: "update" });

    const handleUpdateAll = async () => {
        const targets = plugins.filter(p => p.status === "update-available" && !p.linked);
        targets.forEach(p => addPending(p.namespace));
        const results = await Promise.allSettled(
            targets.map(p => RequestHandler.fetchData("POST", `plugin/${p.namespace}/update`))
        );
        const anySuccess = results.some(r => r.status === "fulfilled" && r.value?.success);
        setPlugins(prev =>
            prev.map(pl => {
                const idx = targets.findIndex(t => t.namespace === pl.namespace);
                if (idx === -1) return pl;
                const result = results[idx];
                if (result.status === "fulfilled" && result.value?.success) {
                    return { ...pl, version: pl.latestVersion, status: "up-to-date" as const };
                }
                return pl;
            })
        );
        if (anySuccess) await clearCache();
        targets.forEach(p => removePending(p.namespace));
    };

    const confirmAction = async () => {
        if (!modal) return;
        const { plugin: pluginName, action } = modal;
        const target = plugins.find(p => p.name === pluginName);
        if (!target) { setModal(null); return; }

        setModal(null);
        addPending(target.namespace);

        try {
            if (action === "remove") {
                const res = await RequestHandler.fetchData("POST", `plugin/delete/${target.namespace}`);
                if (res.success) {
                    setPlugins(prev => prev.filter(p => p.name !== pluginName));
                    await clearCache();
                } else {
                    setError(res.message ?? "Failed to remove plugin");
                }
            } else {
                const res = await RequestHandler.fetchData("POST", `plugin/${target.namespace}/update`);
                if (res.success) {
                    setPlugins(prev =>
                        prev.map(p =>
                            p.name === pluginName
                                ? { ...p, version: p.latestVersion, status: "up-to-date" as const }
                                : p
                        )
                    );
                    await clearCache();
                } else {
                    setError(res.message ?? "Failed to update plugin");
                }
            }
        } catch (err: any) {
            setError(err.message ?? "Something went wrong");
        } finally {
            removePending(target.namespace);
        }
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <>
            <div className="flex flex-col gap-3">

                {/* ── Heading ── */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-display text-[16px] font-bold text-accent glow-accent-text tracking-[0.06em]">
                            Installed Plugins
                        </h1>
                        <p className="text-[12px] font-mono text-text-muted">
                            {loading
                                ? "Loading plugins..."
                                : `${plugins.length} plugin${plugins.length !== 1 ? "s" : ""} registered · ${updateCount} update${updateCount !== 1 ? "s" : ""} available`
                            }
                        </p>
                    </div>

                    {!loading && updateCount > 0 && (
                        <button
                            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-[8px] bg-accent text-bg text-[11px] font-mono font-bold tracking-[0.04em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40"
                            onClick={handleUpdateAll}
                            disabled={pending.size > 0}
                        >
                            ↑ Update All ({updateCount})
                        </button>
                    )}
                </div>

                {/* ── Error banner ── */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-[8px] bg-surface border border-red-500/30 text-red-400 text-[11px] font-mono"
                        >
                            <span>⚠ {error}</span>
                            <button
                                className="text-text-muted hover:text-text transition-colors"
                                onClick={() => setError(null)}
                            >
                                ✕
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Loading skeleton ── */}
                {loading ? (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="h-[200px] rounded-[12px] bg-surface border border-border animate-pulse"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* ── Filter tabs ── */}
                        <FilterTabs
                            filter={filter}
                            totalCount={plugins.length}
                            updateCount={updateCount}
                            onChange={setFilter}
                        />

                        {/* ── Plugin grid ── */}
                        {filtered.length === 0 ? (
                            <div className="flex items-center justify-center py-20 bg-surface border border-border rounded-[10px]">
                                <p className="text-[12px] font-mono text-text-faint">
                                    {plugins.length === 0
                                        ? "No plugins installed."
                                        : "No plugins match this filter."
                                    }
                                </p>
                            </div>
                        ) : (
                            <motion.div
                                className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                                variants={MOTION_CONTAINER}
                                initial="hidden"
                                animate="show"
                            >
                                {filtered.map(plugin => (
                                    <PluginCard
                                        key={plugin.namespace}
                                        plugin={plugin}
                                        pending={pending.has(plugin.namespace)}
                                        onRemove={handleRemove}
                                        onUpdate={handleUpdate}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </>
                )}
            </div>

            {/* ── Confirm modal ── */}
            <AnimatePresence>
                {modal && (
                    <ConfirmModal
                        plugin={modal.plugin}
                        action={modal.action}
                        onConfirm={confirmAction}
                        onCancel={() => setModal(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}