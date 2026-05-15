// ─── components/runner/PromptInput.tsx ───────────────────────
import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

type Props = {
    question: string;
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
};

export default function PromptInput({ question, value, onChange, onSubmit }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    return (
        <motion.div
            className="flex flex-col gap-2 mt-2 p-3 rounded-[8px] border border-neu/30 bg-neu/5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
        >
            {/* Question */}
            <div className="flex items-start gap-2">
                <span className="text-neu text-[11px] font-mono shrink-0 mt-[1px]">?</span>
                <span className="text-[11px] font-mono text-text leading-relaxed">{question}</span>
            </div>

            {/* Answer row */}
            <div className="flex items-center gap-2 pl-4">
                <span className="text-neu/60 text-[11px] font-mono shrink-0">›</span>
                <input
                    ref={inputRef}
                    className="flex-1 bg-surface2 border border-neu/30 focus:border-neu/60 rounded-[6px] px-3 py-1.5 text-[11px] font-mono text-text outline-none transition-all placeholder:text-text-faint/40"
                    placeholder="Type your answer…"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
                />
                <button
                    className="shrink-0 px-3 py-1.5 rounded-[6px] bg-neu/10 border border-neu/30 hover:bg-neu/20 text-[10px] font-mono text-neu transition-all active:scale-[0.97]"
                    onClick={onSubmit}
                >
                    Submit ↵
                </button>
            </div>
        </motion.div>
    );
}