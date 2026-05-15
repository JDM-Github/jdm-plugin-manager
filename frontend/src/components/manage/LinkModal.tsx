// ─── LinkModal.tsx ────────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Spinner from "../Spinner";

type LinkResult = {
    linkPath: string;
};

export default function LinkModal({
    modal, onClose, onConfirm,
}: {
    modal: { namespace: string; pkg: string };
    onClose: () => void;
    onConfirm: (result: LinkResult) => void;
}) {
    const [path, setPath] = useState("");
    const [error, setError] = useState("");
    const [reading, setReading] = useState(false);

    const handleSubmit = async () => {
        const trimmed = path.trim();
        if (!trimmed) { setError("Local path is required"); return; }
        
        setReading(true);
        setError("");

        try {
            onConfirm({ linkPath: trimmed });
        } catch (err: any) {
            setError(err.message ?? "Failed to read package.json");
        } finally {
            setReading(false);
        }
    };

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
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">Link local plugin</h2>
                    <p className="text-[11px] font-mono text-text-muted">{modal.pkg}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-text-faint">Local path</label>
                    <input
                        autoFocus
                        className="w-full bg-bg border border-border rounded-[6px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
                        placeholder="C:\projects\my-plugin"
                        value={path}
                        onChange={e => { setPath(e.target.value); setError(""); }}
                        onKeyDown={e => e.key === "Enter" && !reading && handleSubmit()}
                        disabled={reading}
                    />
                    <AnimatePresence>
                        {error && (
                            <motion.span
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-[10px] font-mono text-neg overflow-hidden"
                            >
                                {error}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <p className="text-[9px] font-mono text-text-faint/50">
                        Description and commands will be read from{" "}
                        <span className="text-accent/50">package.json</span> at this path.
                        The <span className="text-accent/50">name</span> field must match{" "}
                        <span className="text-text-faint">{modal.pkg}</span>.
                    </p>
                </div>

                <div className="flex gap-2 justify-end">
                    <button
                        className="px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:text-text hover:border-border/80 transition-all disabled:opacity-40"
                        onClick={onClose}
                        disabled={reading}
                    >
                        Cancel
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity disabled:opacity-60"
                        onClick={handleSubmit}
                        disabled={reading}
                    >
                        {reading ? <><Spinner size={10} /> Reading…</> : "Link"}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}