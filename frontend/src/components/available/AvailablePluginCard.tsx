// ─── AvailablePluginCard.tsx ──────────────────────────────────
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MOTION_CARD } from "../../lib/constant";
import type { AvailablePlugin } from "../../lib/types";
import Spinner from "../Spinner";

type Props = {
    plugin: AvailablePlugin;
    pending?: boolean;
    pendingAction: "install" | "remove" | "link" | null;
    onInstall: (pkg: string) => void;
    onRemove: (namespace: string) => void;
    onLink: (pkg: string) => void;
};

function OfficialBadge() {
    return (
        <span className="inline-flex items-center gap-[3px] px-1.5 py-[3px] rounded-full bg-accent/10 border border-accent/25 text-accent text-[8px] font-mono font-bold tracking-wider uppercase shrink-0">
            <svg width="7" height="7" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0l1.8 5.4H16l-4.7 3.4 1.8 5.5L8 11l-5.1 3.3 1.8-5.5L0 5.4h6.2z" />
            </svg>
            Official
        </span>
    );
}

/** "2026-05-11T17:55:58.758122+00:00" → "May 11, 2026" */
function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return iso;
    }
}

/** Avatar: profile image if available, else a letter circle */
function SubmitterAvatar({ name, src }: { name: string | null; src: string | null }) {
    const letter = (name ?? "?")[0].toUpperCase();
    if (src) {
        return (
            <img
                src={src}
                alt={name ?? "submitter"}
                className="w-4 h-4 rounded-full object-cover shrink-0 border border-border"
            />
        );
    }
    return (
        <span className="w-4 h-4 rounded-full bg-accent-dim border border-accent-border flex items-center justify-center text-[8px] font-bold font-mono text-accent shrink-0">
            {letter}
        </span>
    );
}

export function AvailablePluginCard({ plugin, pending, pendingAction, onInstall, onRemove, onLink }: Props) {
    const navigate = useNavigate();

    const handleView = () => {
        navigate(`/available/${plugin.namespace}`, { state: { plugin } });
    };

    // npm live version takes priority; fall back to DB latestVersion
    const latestLabel = plugin.npmVersion ?? plugin.latestVersion ?? null;

    const versionLabel = plugin.installed && plugin.installedVersion
        ? plugin.installedVersion
        : latestLabel ?? "—";

    const hasUpdate =
        plugin.installed &&
        !!plugin.installedVersion &&
        !!latestLabel &&
        plugin.installedVersion !== latestLabel;

    const hasDownloads = plugin.weeklyDownloads !== null && plugin.weeklyDownloads !== undefined;

    // approved === null means pending review
    const approvalState: "approved" | "pending" | "rejected" =
        plugin.approved === null ? "pending" : plugin.approved ? "approved" : "rejected";

    return (
        <motion.div
            className="relative bg-surface border border-border hover:border-accent/25 rounded-[12px] p-4 flex flex-col gap-3 transition-colors duration-200 group"
            variants={MOTION_CARD}
        >
            {/* ── Pending action overlay ── */}
            {pending && (
                <div className="absolute inset-0 rounded-[12px] bg-bg/20 backdrop-blur-[1px] pointer-events-none z-10" />
            )}

            {/* ── Header: icon + name + action ── */}
            <div className="flex items-start justify-between gap-3">

                {/* Icon + name block */}
                <div
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={handleView}
                >
                    <div className="w-9 h-9 rounded-[8px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
                        <span className="font-display text-[9px] font-black text-accent tracking-[0.04em]">
                            {plugin.namespace.slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        {/* Package name + official badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] font-semibold text-text font-mono leading-tight truncate group-hover:text-accent transition-colors duration-150">
                                {plugin.package}
                            </span>
                            {plugin.official && <OfficialBadge />}
                        </div>
                        {/* Namespace + version + update arrow + downloads */}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-mono text-text-faint tracking-[0.04em]">
                                {plugin.namespace}
                            </span>
                            {versionLabel !== "—" && (
                                <>
                                    <span className="text-text-faint/30 text-[9px]">·</span>
                                    <span className="text-[9px] font-mono text-accent/60">
                                        v{versionLabel}
                                    </span>
                                    {hasUpdate && (
                                        <span
                                            className="text-[9px] font-mono text-amber-400/70"
                                            title={`Latest: v${latestLabel}`}
                                        >
                                            → v{latestLabel}
                                        </span>
                                    )}
                                </>
                            )}
                            {hasDownloads && (
                                <>
                                    <span className="text-text-faint/30 text-[9px]">·</span>
                                    <span className="text-[9px] font-mono text-text-faint">
                                        {plugin.weeklyDownloads?.toLocaleString()}/wk
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action button(s) */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {!plugin.installed && (
                        <>
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98] disabled:opacity-40"
                                onClick={() => onLink(plugin.package)}
                                disabled={pending}
                                title="Link a local development copy"
                            >
                                {pending && pendingAction === "link"
                                    ? <><Spinner /> Linking…</>
                                    : "⇄ Link"
                                }
                            </button>
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-bg text-[10px] font-mono font-bold tracking-[0.04em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40"
                                onClick={() => onInstall(plugin.package)}
                                disabled={pending}
                            >
                                {pending && pendingAction === "install"
                                    ? <><Spinner /> Installing…</>
                                    : "+ Install"
                                }
                            </button>
                        </>
                    )}
                    {plugin.installed && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:border-neg hover:text-neg transition-colors active:scale-[0.98] disabled:opacity-40"
                            onClick={() => onRemove(plugin.namespace)}
                            disabled={pending}
                        >
                            {pending && pendingAction === "remove"
                                ? <><Spinner /> Removing…</>
                                : "Remove"
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* ── Description ── */}
            <p
                className="text-[11px] font-mono text-text-muted leading-relaxed line-clamp-2 cursor-pointer"
                onClick={handleView}
            >
                {plugin.description}
            </p>

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
            <div className="flex flex-col gap-2 pt-1 border-t border-border/50">

                {/* Row 1: install status */}
                <div>
                    {plugin.installed ? (
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-pos shrink-0" />
                            {plugin.linked ? (
                                <span className="text-[9px] font-mono text-accent/70 flex items-center gap-1.5">
                                    <span className="px-1.5 py-[2px] rounded-[3px] bg-accent-dim border border-accent-border text-[8px] tracking-[0.04em]">
                                        LINKED
                                    </span>
                                    {plugin.localPath && (
                                        <span className="text-amber-400/60 truncate max-w-[140px]" title={plugin.localPath}>
                                            {plugin.localPath}
                                        </span>
                                    )}
                                </span>
                            ) : (
                                <span className="text-[9px] font-mono text-pos">
                                    Installed{plugin.installedVersion ? ` v${plugin.installedVersion}` : ""}
                                </span>
                            )}
                            {hasUpdate && (
                                <span className="text-[9px] font-mono text-amber-400/70 ml-0.5">
                                    · update available
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-text-faint">Not installed</span>
                            {latestLabel && (
                                <>
                                    <span className="text-text-faint/30 text-[9px]">·</span>
                                    <span className="text-[9px] font-mono text-accent/50">latest v{latestLabel}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Row 2: submitter + date + approval */}
                <div className="flex items-center justify-between gap-3">

                    {/* Submitted by */}
                    {plugin.submitted_by ? (
                        <div className="flex items-center gap-2 min-w-0" title={`Submitted by ${plugin.submitted_by}`}>
                            <SubmitterAvatar name={plugin.submitted_by} src={plugin.submitted_profile} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-mono text-text-faint/50 leading-none mb-[2px]">
                                    submitted by
                                </span>
                                <span className="text-[10px] font-mono text-text-muted truncate leading-none">
                                    {plugin.submitted_by}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <span />
                    )}

                    {/* Date + approval pill */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono text-text-faint/60" title={plugin.createdAt}>
                            {formatDate(plugin.createdAt)}
                        </span>

                        {/* Approval pill — hidden for official plugins */}
                        {!plugin.official && (
                            <span className={`
                                inline-flex items-center gap-[3px] px-2 py-[3px] rounded-full text-[8px] font-mono font-bold tracking-wider uppercase border
                                ${approvalState === "approved"
                                    ? "bg-pos/10 border-pos/25 text-pos"
                                    : approvalState === "rejected"
                                        ? "bg-neg/10 border-neg/25 text-neg"
                                        : "bg-text-faint/10 border-text-faint/20 text-text-faint"
                                }
                            `}>
                                {approvalState === "approved" && (
                                    <svg width="6" height="6" viewBox="0 0 12 12" fill="none" aria-hidden>
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                {approvalState === "rejected" && (
                                    <svg width="6" height="6" viewBox="0 0 12 12" fill="none" aria-hidden>
                                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                )}
                                {approvalState === "pending" && (
                                    <svg width="6" height="6" viewBox="0 0 12 12" fill="none" aria-hidden>
                                        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                        <path d="M6 3.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                {approvalState}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}