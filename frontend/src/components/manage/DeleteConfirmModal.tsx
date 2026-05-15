// ─── DeleteConfirmModal.tsx ───────────────────────────────────
import { motion } from "framer-motion";
import type { PluginPartial, ManagedPlugin } from "../../lib/types";

type DeleteTarget =
    | { kind: "partial"; item: PluginPartial }
    | { kind: "plugin"; item: ManagedPlugin };

export default function DeleteConfirmModal({
    target, onClose, onConfirm,
}: {
    target: DeleteTarget;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const isPartial = target.kind === "partial";
    const { item } = target;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-surface border border-border rounded-[14px] p-5 w-full max-w-sm flex flex-col gap-4 mx-4"
                initial={{ scale: 0.96, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                onClick={e => e.stopPropagation()}
            >
                <div>
                    <h2 className="text-[13px] font-bold font-display text-neg tracking-[0.04em]">
                        Delete {isPartial ? "partial" : "plugin"}
                    </h2>
                    <p className="text-[10px] font-mono text-text-faint mt-0.5">
                        This action cannot be undone.
                    </p>
                </div>

                <div className="bg-bg border border-neg/20 rounded-[8px] px-3.5 py-3 flex flex-col gap-2">
                    <p className="text-[11px] font-mono text-text-muted">
                        Delete <span className="text-text font-semibold">{item.package}</span>{" "}
                        <span className="text-text-faint">({item.namespace})</span>?
                    </p>

                    {/* Partial-specific notes */}
                    {isPartial && (target.item as PluginPartial).link_path && (
                        <p className="text-[10px] font-mono text-amber-400/60">
                            ⚠ This partial is currently linked. Local files will not be deleted.
                        </p>
                    )}
                    {isPartial && (
                        <p className="text-[10px] font-mono text-text-faint/60">
                            Any published plugin versions pushed from this partial will not be affected.
                        </p>
                    )}

                    {/* Plugin-specific notes */}
                    {!isPartial && (
                        <p className="text-[10px] font-mono text-text-faint/60">
                            All published versions of this plugin will be removed. Your partial draft will not be affected.
                        </p>
                    )}
                </div>

                <div className="flex gap-2 justify-end">
                    <button
                        className="px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:text-text hover:border-border/80 transition-all"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="px-3 py-1.5 rounded-[6px] bg-neg text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity"
                        onClick={onConfirm}
                    >
                        Delete
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}