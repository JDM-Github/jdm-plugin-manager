// ─── components/runner/TerminalPanel.tsx ─────────────────────
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LogLine } from "../../lib/types";
import LogLineComponent from "./LogLine";
import PromptInput from "./PromptInput";

type Props = {
    logs: LogLine[];
    running: boolean;
    done: boolean;
    exitOk: boolean;
    prompt: string | null;
    promptInput: string;
    panelHeight: string;
    onPromptChange: (val: string) => void;
    onPromptSubmit: () => void;
    onClear: () => void;
};

export default function TerminalPanel({
    logs,
    running,
    done,
    exitOk,
    prompt,
    promptInput,
    panelHeight,
    onPromptChange,
    onPromptSubmit,
    onClear,
}: Props) {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs, prompt]);

    return (
        <div className={`bg-bg border border-accent-border rounded-[12px] overflow-hidden flex flex-col ${panelHeight}`}>
            {/* Top glow */}
            <div className="absolute top-0 right-0 h-48 pointer-events-none" style={{
                background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-accent) 10%, transparent) 0%, transparent 70%)",
            }} />
            {/* Bottom glow */}
            <div className="absolute bottom-0 right-0 h-32 pointer-events-none" style={{
                background: "radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 70%)",
            }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface/60 shrink-0">
                <div className="flex items-center gap-4">
                    {/* Traffic lights */}
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-neg/40" />
                        <span className="w-2.5 h-2.5 rounded-full bg-neu/40" />
                        <span className="w-2.5 h-2.5 rounded-full bg-pos/40" />
                    </div>

                    <span className="text-[9px] font-mono text-text-faint tracking-[0.14em] uppercase">Output</span>

                    {/* Status badge */}
                    <AnimatePresence mode="wait">
                        {running && !prompt && (
                            <motion.span
                                key="running"
                                className="flex items-center gap-1.5 text-[9px] font-mono text-accent"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> EXEC
                            </motion.span>
                        )}
                        {running && prompt && (
                            <motion.span
                                key="waiting"
                                className="flex items-center gap-1.5 text-[9px] font-mono text-neu"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-neu animate-pulse" /> WAITING INPUT
                            </motion.span>
                        )}
                        {done && !running && (
                            <motion.span
                                key="done"
                                className={`text-[9px] font-mono ${exitOk ? "text-pos" : "text-neg"}`}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            >
                                {exitOk ? "✔ COMPLETE" : "✖ FAILED"}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Line count + clear */}
                <div className="flex items-center gap-3">
                    {logs.length > 0 && (
                        <>
                            <span className="text-[9px] font-mono text-text-faint">{logs.length} lines</span>
                            <button
                                className="text-[9px] font-mono text-text-faint hover:text-text transition-colors"
                                onClick={onClear}
                            >
                                Clear
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Scrollable log body — user-select: text so output is copyable */}
            <div
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5"
                style={{ userSelect: "text" }}
            >
                {logs.length === 0 && !prompt ? (
                    <div className="flex items-center gap-2 pt-1" style={{ userSelect: "none" }}>
                        <span className="text-accent/30 text-[11px] font-mono">$</span>
                        <span className="text-[11px] font-mono text-text-faint/50 italic">
                            {running ? "Starting process..." : "Awaiting execution — press Run."}
                        </span>
                        {!running && <span className="w-1.5 h-3.5 bg-accent/30 animate-pulse rounded-[1px]" />}
                    </div>
                ) : (
                    logs.map((line, i) => <LogLineComponent key={i} line={line} index={i} />)
                )}

                {/* Inline prompt */}
                <AnimatePresence>
                    {prompt !== null && (
                        <PromptInput
                            question={prompt}
                            value={promptInput}
                            onChange={onPromptChange}
                            onSubmit={onPromptSubmit}
                        />
                    )}
                </AnimatePresence>

                <div ref={logEndRef} />
            </div>
        </div>
    );
}