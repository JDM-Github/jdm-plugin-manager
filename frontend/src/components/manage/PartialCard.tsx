// ─── PartialCard.tsx ──────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_CARD } from "../../lib/constant";
import type { PluginPartial } from "../../lib/types";
import Spinner from "../Spinner";

type Props = {
    partial: PluginPartial;
    pending?: boolean;
    pendingAction: "link" | "unlink" | "push" | "delete" | "install" | "install" | null;
    onInstall: (namespace: string, linkPath: string) => void;
    onEdit: (partial: PluginPartial) => void;
    onLink: (namespace: string) => void;
    onUnlink: (namespace: string) => void;
    onPush: (namespace: string) => void;
    onDelete: (namespace: string) => void;
};

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });
    } catch {
        return iso;
    }
}

export function PartialCard({
    partial, pending, pendingAction, onEdit, onLink, onUnlink, onPush, onDelete, onInstall
}: Props) {
    const isLinked = !!partial.link_path;
    const hasMetadata = isLinked && (partial.description || partial.commands.length > 0);

    return (
        <motion.div
            className="relative bg-surface border border-border hover:border-accent/20 rounded-[12px] p-4 flex flex-col gap-3 transition-colors duration-200 group"
            variants={MOTION_CARD}
        >
            {/* Pending overlay */}
            {pending && (
                <div className="absolute inset-0 rounded-[12px] bg-bg/20 backdrop-blur-[1px] pointer-events-none z-10" />
            )}

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-[8px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
                        <span className="font-display text-[9px] font-black text-accent tracking-[0.04em]">
                            {partial.namespace.slice(0, 2).toUpperCase()}
                        </span>
                    </div>

                    {/* Name + version + namespace */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] font-semibold text-text font-mono leading-tight truncate group-hover:text-accent transition-colors duration-150">
                                {partial.package}
                            </span>
                            <span className="text-[8px] font-mono text-text-faint/60 bg-bg border border-border px-1.5 py-[2px] rounded-[4px]">
                                v{partial.version}
                            </span>
                        </div>
                        <span className="text-[9px] font-mono text-text-faint tracking-[0.04em] mt-0.5 block">
                            {partial.namespace}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Edit — only when not linked */}
                    {!isLinked && (
                        <button
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98] disabled:opacity-40"
                            onClick={() => onEdit(partial)}
                            disabled={pending}
                            title="Edit partial"
                        >
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                                <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                            </svg>
                            Edit
                        </button>
                    )}

                    {/* Link / Unlink + Install */}
                    {!isLinked ? (
                        <button
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98] disabled:opacity-40"
                            onClick={() => onLink(partial.namespace)}
                            disabled={pending}
                            title="Link a local path"
                        >
                            {pending && pendingAction === "link"
                                ? <><Spinner size={9} /> Linking…</>
                                : <>⇄ Link</>
                            }
                        </button>
                    ) : (
                        <>
                            <button
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-amber-500/30 text-amber-400/70 text-[10px] font-mono hover:border-amber-500/60 hover:text-amber-400 transition-colors active:scale-[0.98] disabled:opacity-40"
                                onClick={() => onUnlink(partial.namespace)}
                                disabled={pending}
                                title="Remove local link"
                            >
                                {pending && pendingAction === "unlink"
                                    ? <><Spinner size={9} /> Unlinking…</>
                                    : <>⇄ Unlink</>
                                }
                            </button>

                            <button
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-emerald-500/30 text-emerald-400/70 text-[10px] font-mono hover:border-emerald-500/60 hover:text-emerald-400 transition-colors active:scale-[0.98] disabled:opacity-40"
                                onClick={() => onInstall(partial.namespace, partial.link_path!)}
                                disabled={pending}
                                title="Install plugin from linked path"
                            >
                                {pending && pendingAction === "install"
                                    ? <><Spinner size={9} /> Installing…</>
                                    : <>
                                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                                            <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M2 2h12v12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                        Install
                                    </>
                                }
                            </button>
                        </>
                    )}

                    {/* Push — only when linked */}
                    <AnimatePresence>
                        {isLinked && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                                animate={{ opacity: 1, scale: 1, width: "auto" }}
                                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-accent text-bg text-[10px] font-mono font-bold tracking-[0.04em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40 overflow-hidden whitespace-nowrap"
                                onClick={() => onPush(partial.namespace)}
                                disabled={pending}
                                title="Push to plugin registry"
                            >
                                {pending && pendingAction === "push"
                                    ? <><Spinner size={9} /> Pushing…</>
                                    : <>
                                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                                            <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        </svg>
                                        Push
                                    </>
                                }
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Description ── */}
            <AnimatePresence>
                {hasMetadata && partial.description ? (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] font-mono text-text-muted leading-relaxed line-clamp-2 overflow-hidden"
                    >
                        {partial.description}
                    </motion.p>
                ) : !isLinked ? (
                    <p className="text-[11px] font-mono text-text-faint/50 italic">
                        Link a local path to load description &amp; commands from package.json
                    </p>
                ) : null}
            </AnimatePresence>

            {/* ── Commands ── */}
            <AnimatePresence>
                {hasMetadata && partial.commands.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-1 overflow-hidden"
                    >
                        {partial.commands.map(cmd => (
                            <span
                                key={cmd.name}
                                className="text-[9px] font-mono text-text-faint bg-bg border border-border px-1.5 py-[2px] rounded-[3px]"
                            >
                                {cmd.name}
                            </span>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                {/* Link status */}
                <div className="flex items-center gap-1.5 min-w-0">
                    {isLinked ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-[8px] font-mono px-1.5 py-[2px] rounded-[3px] bg-accent-dim border border-accent-border text-accent tracking-[0.04em] shrink-0">
                                LINKED
                            </span>
                            <span
                                className="text-[9px] font-mono text-text-faint/60 truncate"
                                title={partial.link_path}
                            >
                                {partial.link_path}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                            <span className="text-[9px] font-mono text-text-faint">Not linked</span>
                        </>
                    )}
                </div>

                {/* Date + delete */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono text-text-faint/50">
                        {formatDate(partial.created_at)}
                    </span>
                    <button
                        className="text-[9px] font-mono text-text-faint/40 hover:text-neg transition-colors px-1.5 py-[3px] rounded-[4px] hover:bg-neg/10 border border-transparent hover:border-neg/20 active:scale-[0.97] disabled:opacity-30"
                        onClick={() => onDelete(partial.namespace)}
                        disabled={pending}
                        title="Delete partial"
                    >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}