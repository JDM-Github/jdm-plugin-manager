// ─── PluginCard.tsx ───────────────────────────────────────────
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_ROW } from "../../lib/constant";
import type { Plugin } from "../../lib/types";
import { StatusBadge } from "./StatusBadge";
import { PluginIcon } from "./PluginIcon";

type Props = {
    plugin: Plugin;
    pending?: boolean;
    running?: boolean;
    onRemove: (name: string) => void;
    onUpdate: (name: string) => void;
};

function formatInstalledAt(iso: string): string {
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

export function PluginCard({ plugin, pending, running, onRemove, onUpdate }: Props) {
    const navigate = useNavigate();
    const isBlocked = pending || running;

    return (
        <motion.div
            className={`
                bg-surface border rounded-[12px] overflow-hidden flex flex-col transition-colors duration-200 group relative
                ${running
                    ? "border-accent/40 shadow-[0_0_0_1px_theme(colors.accent/0.15),0_0_16px_theme(colors.accent/0.06)]"
                    : "border-border hover:border-accent/25"
                }
            `}
            variants={MOTION_ROW}
            layout
        >
            {/* Running progress bar — top edge */}
            <AnimatePresence>
                {running && (
                    <motion.div
                        className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className="h-full bg-accent/60"
                            style={{ width: "40%" }}
                            animate={{ x: ["-100%", "350%"] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 p-4">

                <div className="flex items-start justify-between gap-2">
                    <PluginIcon namespace={plugin.namespace} />
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Running badge */}
                        <AnimatePresence>
                            {running && (
                                <motion.span
                                    key="running-badge"
                                    className="flex items-center gap-1 text-[9px] font-mono text-accent bg-accent/10 border border-accent/25 px-1.5 py-[2px] rounded-[3px]"
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <span className="relative flex w-1.5 h-1.5">
                                        <span className="absolute inset-0 rounded-full bg-accent opacity-40 animate-ping" style={{ animationDuration: "1.2s" }} />
                                        <span className="relative w-1.5 h-1.5 rounded-full bg-accent" />
                                    </span>
                                    RUNNING
                                </motion.span>
                            )}
                        </AnimatePresence>

                        {plugin.linked && (
                            <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-1.5 py-[2px] rounded-[3px]">
                                LINKED
                            </span>
                        )}
                        <StatusBadge status={plugin.status} />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-text font-mono leading-tight">
                            {plugin.name}
                        </span>
                        <span className="text-[9px] font-mono text-accent/50 bg-accent-dim border border-accent-border px-1.5 py-[2px] rounded-[3px] shrink-0">
                            v{plugin.version}
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-text-faint">
                        {plugin.namespace}
                    </span>
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed line-clamp-2 mt-0.5">
                        {plugin.description}
                    </p>
                </div>

                {plugin.commands.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {plugin.commands.map(cmd => (
                            <span
                                key={cmd.name}
                                title={cmd.description}
                                className="text-[9px] font-mono text-text-faint bg-bg border border-border px-1.5 py-[2px] rounded-[3px] cursor-default"
                            >
                                {cmd.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-auto px-4 py-3 border-t border-border flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-text-faint">
                        Installed {formatInstalledAt(plugin.installedAt)}
                    </span>
                    {plugin.status === "update-available" && !running && (
                        <span className="text-[9px] font-mono text-neu">
                            → v{plugin.latestVersion}
                        </span>
                    )}
                    {plugin.status === "higher-version" && !running && (
                        <span className="text-[9px] font-mono text-neg">
                            ↑ v{plugin.latestVersion}
                        </span>
                    )}
                    {plugin.linked && plugin.localPath && !running && (
                        <span
                            className="text-[9px] font-mono text-amber-400/60 truncate max-w-[140px]"
                            title={plugin.localPath}
                        >
                            {plugin.localPath}
                        </span>
                    )}
                    {running && (
                        <span className="text-[9px] font-mono text-accent/50 italic">
                            executing…
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent-dim border border-accent-border text-accent text-[11px] font-mono font-semibold hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40"
                        onClick={() => navigate(`/plugin-runner/${plugin.namespace}`)}
                        disabled={pending}
                    >
                        {running ? (
                            <span className="flex items-center gap-1.5">
                                <motion.span
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    ▶
                                </motion.span>
                                View
                            </span>
                        ) : "▶ Run"}
                    </button>

                    {plugin.status === "update-available" && !plugin.linked && (
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-bg text-[11px] font-mono font-semibold tracking-[0.03em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40"
                            onClick={() => onUpdate(plugin.name)}
                            disabled={isBlocked}
                        >
                            {pending ? "···" : "↑ Update"}
                        </button>
                    )}

                    <button
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-border text-text-muted text-[11px] font-mono hover:border-neg hover:text-neg transition-colors active:scale-[0.98] disabled:opacity-40"
                        onClick={() => onRemove(plugin.name)}
                        disabled={isBlocked}
                    >
                        {pending ? "···" : "Remove"}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}