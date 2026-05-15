import { motion } from "framer-motion";

type Props = {
    plugin: string;
    action: "remove" | "update";
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmModal({ plugin, action, onConfirm, onCancel }: Props) {
    const isRemove = action === "remove";

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
        >
            <motion.div
                className="bg-surface border border-accent/20 rounded-[12px] p-6 w-[360px] glow-accent"
                initial={{ scale: 0.95, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 8 }}
                transition={{ duration: 0.15 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="font-display text-[12px] font-bold text-accent glow-accent-text tracking-[0.08em] mb-1">
                    {isRemove ? "REMOVE PLUGIN" : "UPDATE PLUGIN"}
                </div>

                <p className="text-[12px] font-mono text-text-muted mb-5 leading-relaxed">
                    {isRemove ? (
                        <>Are you sure you want to remove{" "}
                            <span className="text-text font-semibold">{plugin}</span>?{" "}
                            This cannot be undone.
                        </>
                    ) : (
                        <>Update{" "}
                            <span className="text-text font-semibold">{plugin}</span>{" "}
                            to the latest version?
                        </>
                    )}
                </p>

                <div className="flex items-center gap-2 justify-end">
                    <button
                        className="px-4 py-2 rounded-[7px] border border-border text-text-muted text-[11px] font-mono hover:border-accent/20 hover:text-text transition-colors"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 rounded-[7px] text-bg text-[11px] font-mono font-bold tracking-[0.04em] transition-opacity hover:opacity-85 active:scale-[0.98] ${isRemove ? "bg-neg" : "bg-accent"
                            }`}
                        onClick={onConfirm}
                    >
                        {isRemove ? "Remove" : "Update"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}