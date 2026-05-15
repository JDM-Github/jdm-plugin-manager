// ─── PartialFormModal.tsx ─────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { PartialFormModal } from "../../lib/types";

export default function PartialFormModalComponent({
    modal, onClose, onConfirm,
}: {
    modal: PartialFormModal;
    onClose: () => void;
    onConfirm: (namespace: string, pkg: string, version: string) => void;
}) {
    const [namespace, setNamespace] = useState(modal.partial.namespace ?? "");
    const [pkg, setPkg] = useState(modal.partial.package ?? "");
    const [version, setVersion] = useState(modal.partial.version ?? "1.0.0");

    const [nsError, setNsError] = useState("");
    const [pkgError, setPkgError] = useState("");
    const [vError, setVError] = useState("");

    const isEdit = modal.mode === "edit";

    const handleSubmit = () => {
        let ok = true;
        if (!namespace.trim()) { setNsError("Namespace is required"); ok = false; } else setNsError("");
        if (!pkg.trim()) { setPkgError("Package name is required"); ok = false; } else setPkgError("");
        if (!version.trim()) { setVError("Version is required"); ok = false; }
        else {
            const semver = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
            if (!semver.test(version.trim())) {
                setVError("Must be a valid semver (e.g. 1.0.0)"); ok = false;
            } else setVError("");
        }
        if (!ok) return;
        onConfirm(namespace.trim(), pkg.trim(), version.trim());
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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">
                            {isEdit ? "Edit partial" : "New partial"}
                        </h2>
                        <p className="text-[10px] font-mono text-text-faint">
                            {isEdit ? "Update your plugin draft" : "Create a new plugin draft"}
                        </p>
                    </div>
                    <button className="text-text-faint hover:text-text transition-colors text-[11px]" onClick={onClose}>✕</button>
                </div>

                {/* Namespace */}
                <Field
                    label="Namespace"
                    required
                    hint={<>Unique identifier — e.g. <span className="text-accent/50">my-plugin</span></>}
                    error={nsError}
                >
                    <input
                        autoFocus
                        className={input()}
                        placeholder="my-plugin"
                        value={namespace}
                        onChange={e => { setNamespace(e.target.value); setNsError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    />
                </Field>

                {/* Package */}
                <Field
                    label="Package name"
                    required
                    hint={<>npm package — e.g. <span className="text-accent/50">@myorg/my-plugin</span></>}
                    error={pkgError}
                >
                    <input
                        className={input()}
                        placeholder="@scope/my-plugin"
                        value={pkg}
                        onChange={e => { setPkg(e.target.value); setPkgError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    />
                </Field>

                {/* Version */}
                <Field
                    label="Version"
                    required
                    hint="Semver — must be greater than the last pushed version"
                    error={vError}
                >
                    <input
                        className={input()}
                        placeholder="1.0.0"
                        value={version}
                        onChange={e => { setVersion(e.target.value); setVError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    />
                </Field>

                {/* Actions */}
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
                        {isEdit ? "Save" : "Create"}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Sub-components ────────────────────────────────────────────

function input() {
    return "w-full bg-bg border border-border rounded-[6px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors";
}

function Field({ label, required, hint, error, children }: {
    label: string;
    required?: boolean;
    hint?: React.ReactNode;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-text-faint">
                {label}{required && <span className="text-neg ml-0.5">*</span>}
            </label>
            {children}
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
            {hint && !error && (
                <p className="text-[9px] font-mono text-text-faint/50">{hint}</p>
            )}
        </div>
    );
}