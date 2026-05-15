// ─── ManagedPluginCard.tsx ────────────────────────────────────
import { motion } from "framer-motion";
import { MOTION_CARD } from "../../lib/constant";
import type { ManagedPlugin } from "../../lib/types";
import Spinner from "../Spinner";

type Props = {
    plugin: ManagedPlugin;
    pendingDelete?: boolean;
    onDelete: (namespace: string) => void;
};

function ApprovalPill({ approved }: { approved: boolean | null }) {
    const state = approved === null ? "pending" : approved ? "approved" : "rejected";

    const styles = {
        approved: "bg-pos/10 border-pos/25 text-pos",
        rejected: "bg-neg/10 border-neg/25 text-neg",
        pending: "bg-text-faint/10 border-text-faint/20 text-text-faint",
    };

    return (
        <span className={`inline-flex items-center gap-[3px] px-2 py-[3px] rounded-full text-[8px] font-mono font-bold tracking-wider uppercase border ${styles[state]}`}>
            {state === "approved" && (
                <svg width="6" height="6" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {state === "rejected" && (
                <svg width="6" height="6" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            )}
            {state === "pending" && (
                <svg width="6" height="6" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M6 3.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {state}
        </span>
    );
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });
    } catch {
        return iso;
    }
}

export function ManagedPluginCard({ plugin, pendingDelete, onDelete }: Props) {
    return (
        <motion.div
            className="relative bg-surface border border-border hover:border-border/80 rounded-[12px] p-4 flex flex-col gap-3 transition-colors duration-200 group"
            variants={MOTION_CARD}
        >
            {/* Pending overlay */}
            {pendingDelete && (
                <div className="absolute inset-0 rounded-[12px] bg-bg/20 backdrop-blur-[1px] pointer-events-none z-10" />
            )}

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-[8px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
                        <span className="font-display text-[9px] font-black text-accent tracking-[0.04em]">
                            {plugin.namespace.slice(0, 2).toUpperCase()}
                        </span>
                    </div>

                    {/* Name + version + approval */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] font-semibold text-text font-mono leading-tight truncate">
                                {plugin.package}
                            </span>
                            <span className="text-[8px] font-mono text-text-faint/60 bg-bg border border-border px-1.5 py-[2px] rounded-[4px]">
                                v{plugin.version}
                            </span>
                            <ApprovalPill approved={plugin.approved} />
                        </div>
                        <span className="text-[9px] font-mono text-text-faint tracking-[0.04em] mt-0.5 block">
                            {plugin.namespace}
                        </span>
                    </div>
                </div>

                {/* Delete only */}
                <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-transparent text-text-faint/40 text-[10px] font-mono hover:text-neg hover:bg-neg/10 hover:border-neg/20 transition-colors active:scale-[0.97] disabled:opacity-30"
                    onClick={() => onDelete(plugin.namespace)}
                    disabled={pendingDelete}
                    title="Delete all versions of this plugin"
                >
                    {pendingDelete
                        ? <Spinner size={9} />
                        : <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    }
                </button>
            </div>

            {/* ── Description ── */}
            {plugin.description ? (
                <p className="text-[11px] font-mono text-text-muted leading-relaxed line-clamp-2">
                    {plugin.description}
                </p>
            ) : (
                <p className="text-[11px] font-mono text-text-faint/40 italic">No description</p>
            )}

            {/* ── Commands ── */}
            {plugin.commands.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {plugin.commands.map(cmd => (
                        <span
                            key={cmd}
                            className="text-[9px] font-mono text-text-faint bg-bg border border-border px-1.5 py-[2px] rounded-[3px]"
                        >
                            {cmd}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Footer ── */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                    {plugin.is_official && (
                        <span className="text-[8px] font-mono px-1.5 py-[2px] rounded-[3px] bg-accent-dim border border-accent-border text-accent tracking-[0.04em]">
                            OFFICIAL
                        </span>
                    )}
                    <span className="text-[9px] font-mono text-text-faint/50">
                        Submitted {formatDate(plugin.created_at)}
                    </span>
                </div>
                <span className="text-[9px] font-mono text-text-faint/40">
                    read-only
                </span>
            </div>
        </motion.div>
    );
}