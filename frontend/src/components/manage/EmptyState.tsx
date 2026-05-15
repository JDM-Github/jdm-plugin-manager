import { motion } from "framer-motion";

export default function EmptyState({ hasSearch, onNew }: { hasSearch: boolean; onNew: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-20 bg-surface border border-border rounded-[10px]"
        >
            {!hasSearch && (
                <div className="w-10 h-10 rounded-[10px] bg-accent-dim border border-accent-border flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
            )}
            <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-[12px] font-mono text-text-faint">
                    {hasSearch ? "No plugins match your search." : "No plugins yet."}
                </p>
                {!hasSearch && (
                    <p className="text-[10px] font-mono text-text-faint/50">Create your first plugin to get started.</p>
                )}
            </div>
            {!hasSearch && (
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity"
                    onClick={onNew}
                >
                    + New Plugin
                </button>
            )}
        </motion.div>
    );
}