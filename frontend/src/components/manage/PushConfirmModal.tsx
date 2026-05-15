// ─── PushConfirmModal.tsx ─────────────────────────────────────
import { motion } from "framer-motion";
import type { PluginPartial } from "../../lib/types";
import Spinner from "../Spinner";

export default function PushConfirmModal({
    partial, onClose, onConfirm, pushing,
}: {
    partial: PluginPartial;
    onClose: () => void;
    onConfirm: () => void;
    pushing: boolean;
}) {
    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-surface border border-border rounded-[14px] p-5 w-full max-w-md flex flex-col gap-4 mx-4"
                initial={{ scale: 0.96, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Icon + title */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[8px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent" aria-hidden>
                            <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">Push to Available</h2>
                        <p className="text-[10px] font-mono text-text-faint mt-0.5">
                            {partial.package} <span className="text-text-faint/50">v{partial.version}</span>
                        </p>
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 bg-bg border border-border rounded-[8px] px-3.5 py-3">
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                        This will submit{" "}
                        <span className="text-accent">{partial.namespace}</span>{" "}
                        <span className="text-text-faint/60">v{partial.version}</span>{" "}
                        to the public registry for review. It will appear as{" "}
                        <span className="text-text">community</span> — not official.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="text-text-faint shrink-0" aria-hidden>
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-[9px] font-mono text-text-faint/70">
                            A new version row will be created. Requires admin approval before becoming publicly visible.
                        </span>
                    </div>
                </div>

                {/* What will be submitted */}
                {(partial.description || partial.commands.length > 0) && (
                    <div className="flex flex-col gap-2 bg-bg border border-border rounded-[8px] px-3.5 py-3">
                        <span className="text-[9px] font-mono text-text-faint uppercase tracking-wider">
                            Will be submitted with
                        </span>
                        {partial.description && (
                            <p className="text-[10px] font-mono text-text-muted line-clamp-2">
                                {partial.description}
                            </p>
                        )}
                        {partial.commands.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {partial.commands.map(cmd => (
                                    <span
                                        key={cmd.name}
                                        className="text-[8px] font-mono text-text-faint bg-surface border border-border px-1.5 py-[2px] rounded-[3px]"
                                    >
                                        {cmd.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                    <button
                        className="px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:text-text hover:border-border/80 transition-all disabled:opacity-40"
                        onClick={onClose}
                        disabled={pushing}
                    >
                        Cancel
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity disabled:opacity-60"
                        onClick={onConfirm}
                        disabled={pushing}
                    >
                        {pushing
                            ? <><Spinner size={10} /> Pushing…</>
                            : <>
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                                    <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                Push v{partial.version}
                            </>
                        }
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}