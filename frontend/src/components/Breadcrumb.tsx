// ─── components/runner/Breadcrumb.tsx ────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import type { Command } from "../lib/types";

type Props = {
    namespace: string;
    commandCount: number;
    activeCommand: Command | null;
    onBack: () => void;
    textBreadcrumb: string;
};

export default function Breadcrumb({ namespace, commandCount, activeCommand, onBack, textBreadcrumb }: Props) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button
                    className="text-[10px] font-mono text-text-faint hover:text-accent transition-colors"
                    onClick={onBack}
                >
                    {textBreadcrumb}
                </button>
                <span className="text-text-faint/40 text-[10px] font-mono">›</span>
                <span className="text-[10px] font-display font-bold text-accent/80 tracking-[0.06em]">
                    {namespace}
                </span>
                <AnimatePresence>
                    {activeCommand && (
                        <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                        >
                            <span className="text-text-faint/40 text-[10px] font-mono">›</span>
                            <span className="text-[10px] font-mono text-accent">{activeCommand.name}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <span className="text-[9px] font-mono text-text-faint bg-surface border border-accent-border px-2 py-[3px] rounded-[4px]">
                {commandCount} commands
            </span>
        </div>
    );
}