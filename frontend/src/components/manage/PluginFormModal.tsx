import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { PluginFormModal } from "../../lib/types";

export default function PluginFormModalComponent({
    modal, onClose, onConfirm,
}: {
    modal: PluginFormModal;
    onClose: () => void;
    onConfirm: (namespace: string, pkg: string) => void;
}) {
    const [namespace, setNamespace] = useState(modal.plugin.namespace ?? "");
    const [pkg, setPkg] = useState(modal.plugin.package ?? "");
    const [nsError, setNsError] = useState("");
    const [pkgError, setPkgError] = useState("");

    const handleSubmit = () => {
        let ok = true;
        if (!namespace.trim()) { setNsError("Namespace is required"); ok = false; } else setNsError("");
        if (!pkg.trim()) { setPkgError("Package name is required"); ok = false; } else setPkgError("");
        if (!ok) return;
        onConfirm(namespace.trim(), pkg.trim());
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
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">
                            {modal.mode === "new" ? "New plugin" : "Edit plugin"}
                        </h2>
                        <p className="text-[10px] font-mono text-text-faint">
                            {modal.mode === "new" ? "Register a new plugin entry" : "Update namespace or package name"}
                        </p>
                    </div>
                    <button className="text-text-faint hover:text-text transition-colors text-[11px]" onClick={onClose}>✕</button>
                </div>

                {/* Namespace */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-text-faint">
                        Namespace <span className="text-neg">*</span>
                    </label>
                    <input
                        autoFocus
                        className="w-full bg-bg border border-border rounded-[6px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
                        placeholder="my-plugin"
                        value={namespace}
                        onChange={e => setNamespace(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    />
                    <AnimatePresence>
                        {nsError && (
                            <motion.span
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="text-[10px] font-mono text-neg overflow-hidden"
                            >
                                {nsError}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <p className="text-[9px] font-mono text-text-faint/50">
                        Unique identifier (e.g. <span className="text-accent/50">my-plugin</span>)
                    </p>
                </div>

                {/* Package */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-text-faint">
                        Package name <span className="text-neg">*</span>
                    </label>
                    <input
                        className="w-full bg-bg border border-border rounded-[6px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
                        placeholder="@scope/my-plugin"
                        value={pkg}
                        onChange={e => setPkg(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    />
                    <AnimatePresence>
                        {pkgError && (
                            <motion.span
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="text-[10px] font-mono text-neg overflow-hidden"
                            >
                                {pkgError}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <p className="text-[9px] font-mono text-text-faint/50">
                        npm package name (e.g. <span className="text-accent/50">@myorg/my-plugin</span>)
                    </p>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <button
                        className="px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:text-text hover:border-border/80 transition-all"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="px-3 py-1.5 rounded-[6px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity"
                        onClick={handleSubmit}
                    >
                        {modal.mode === "new" ? "Create" : "Save"}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}