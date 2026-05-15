// ─── components/runner/ConfigPanel.tsx ───────────────────────
import { motion, AnimatePresence } from "framer-motion";
import type { Command } from "../../lib/types";

type Props = {
    activeCommand: Command | null;
    fieldValues: Record<string, string | boolean>;
    running: boolean;
    done: boolean;
    exitOk: boolean;
    panelHeight: string;
    previewText: string;
    onUpdateField: (key: string, value: string | boolean) => void;
    onRun: () => void;
};

export default function ConfigPanel({
    activeCommand,
    fieldValues,
    running,
    done,
    exitOk,
    panelHeight,
    previewText,
    onUpdateField,
    onRun,
}: Props) {
    return (
        <div className={`bg-surface border border-accent-border rounded-[12px] overflow-hidden flex flex-col ${panelHeight}`}>

            <AnimatePresence mode="wait">
                {!activeCommand ? (
                    <motion.div
                        key="empty-config"
                        className="flex-1 flex flex-col items-center justify-center gap-3"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <div className="w-10 h-10 rounded-[8px] bg-surface2 border border-border flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-text-faint">
                                <path d="M4 6h12M4 10h8M4 14h10" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[12px] font-mono text-text-muted">Select a command</p>
                            <p className="text-[10px] font-mono text-text-faint">to configure and run</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key={activeCommand.name}
                        className="flex flex-col flex-1 min-h-0"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-surface2/40 shrink-0">
                                <span className="font-display text-[11px] font-bold text-accent tracking-[0.06em] glow-accent-text">
                                {activeCommand.name}
                            </span>
                            {activeCommand.fields.length > 0 && (
                                <span className="text-[9px] font-mono text-text-faint shrink-0">
                                    {activeCommand.fields.filter(f => f.required).length} required
                                </span>
                            )}
                        </div>

                        {/* Scrollable fields */}
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                            {activeCommand.description && (
                                <p className="text-[10px] font-mono text-text-faint leading-relaxed">
                                    {activeCommand.description}
                                </p>
                            )}

                            {activeCommand.fields.length === 0 ? (
                                <p className="text-[11px] font-mono text-text-faint">
                                    No configuration required — ready to run.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {activeCommand.fields.map(field => (
                                        <div key={field.key} className="flex flex-col gap-1.5">
                                            <label className="flex items-center gap-1.5 text-[9px] font-mono text-text-faint tracking-[0.12em] uppercase">
                                                {field.label}
                                                {field.required && <span className="text-neg text-[10px]">*</span>}
                                            </label>

                                            {field.type === "text" && (
                                                <input
                                                    className="bg-surface2 border border-border rounded-[8px] px-3 py-2 text-[12px] font-mono text-text outline-none focus:border-accent/50 focus:bg-surface3 transition-all placeholder:text-text-faint/50 w-full"
                                                    placeholder={field.placeholder}
                                                    value={(fieldValues[field.key] as string) ?? ""}
                                                    onChange={e => onUpdateField(field.key, e.target.value)}
                                                />
                                            )}

                                            {field.type === "select" && (
                                                <select
                                                    className="bg-surface2 border border-border rounded-[8px] px-3 py-2 text-[12px] font-mono text-text outline-none focus:border-accent/50 transition-all cursor-pointer w-full"
                                                    value={(fieldValues[field.key] as string) ?? field.options?.[0]}
                                                    onChange={e => onUpdateField(field.key, e.target.value)}
                                                >
                                                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            )}

                                            {field.type === "boolean" && (
                                                <button
                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-[8px] border text-[11px] font-mono transition-all text-left ${fieldValues[field.key]
                                                        ? "bg-accent-dim border-accent-border text-accent"
                                                        : "bg-surface2 border-border text-text-faint hover:border-border2 hover:text-text-muted"
                                                        }`}
                                                    onClick={() => onUpdateField(field.key, !fieldValues[field.key])}
                                                >
                                                    <span className={`relative w-7 h-4 rounded-full border transition-all shrink-0 ${fieldValues[field.key] ? "bg-accent/20 border-accent/50" : "bg-surface3 border-border2"}`}>
                                                        <span className={`absolute top-[2px] w-2.5 h-2.5 rounded-full transition-all ${fieldValues[field.key] ? "left-[13px] bg-accent" : "left-[2px] bg-text-faint"}`} />
                                                    </span>
                                                    {field.flag}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Preview + Run — pinned to bottom */}
                        <div className="shrink-0 border-t border-border p-4 flex flex-col gap-2 bg-surface2/30">
                            <div className="flex items-center gap-2 bg-bg border border-border rounded-[8px] px-3 py-2 overflow-hidden">
                                <span className="text-accent/50 text-[11px] font-mono shrink-0">$</span>
                                <code className="text-[10px] font-mono text-text-faint whitespace-nowrap overflow-x-auto">
                                    {previewText}
                                </code>
                            </div>
                            <button
                                className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] text-[11px] font-mono font-semibold tracking-[0.04em] transition-all ${running
                                    ? "bg-accent/20 border border-accent/30 text-accent cursor-wait"
                                    : done && exitOk
                                        ? "bg-pos/10 border border-pos/30 text-pos hover:opacity-80 active:scale-[0.97]"
                                        : done && !exitOk
                                            ? "bg-neg/10 border border-neg/30 text-neg hover:opacity-80 active:scale-[0.97]"
                                            : "bg-accent text-bg hover:opacity-85 active:scale-[0.97]"
                                    }`}
                                onClick={onRun}
                                disabled={running}
                            >
                                {running ? (
                                    <>
                                        <span className="w-3 h-3 rounded-full border border-accent/40 border-t-accent animate-spin shrink-0" />
                                        Running
                                    </>
                                ) : done ? (
                                    exitOk ? "✔ Done" : "✖ Failed"
                                ) : (
                                    "▶ Run"
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}