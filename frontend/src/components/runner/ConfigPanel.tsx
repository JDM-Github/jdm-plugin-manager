// ─── components/runner/ConfigPanel.tsx ───────────────────────
import { motion, AnimatePresence } from "framer-motion";
import type { Command, Field } from "../../lib/types";

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

    // ── Active switch_button class_target ─────────────────────
    // e.g. "blueprint" | "socket" | null
    const activeSwitchTarget = activeCommand?.fields
        .find(f => f.radio && f.class === "switch_button" && fieldValues[f.key] === true)
        ?.class_target ?? null;

    // ── All classes that are radio switch_button targets ───────
    // e.g. Set { "blueprint", "socket" }
    const switchTargets = new Set(
        activeCommand?.fields
            .filter(f => f.radio && f.class === "switch_button" && f.class_target)
            .map(f => f.class_target!) ?? []
    );

    // ── Classes currently disabled via disable_when_active ─────
    // e.g. when --full is true → Set { "manual" }
    const disabledClasses = new Set(
        activeCommand?.fields
            .filter(f => f.disable_when_active && fieldValues[f.key] === true)
            .map(f => f.disable_when_active!) ?? []
    );

    // ── Mutual-exclusion handler for radio fields ──────────────
    const handleRadioSelect = (clicked: Field) => {
        activeCommand?.fields
            .filter(f => f.radio && f.class === clicked.class && f.key !== clicked.key)
            .forEach(f => onUpdateField(f.key, false));
        onUpdateField(clicked.key, true);
    };

    // ── Visibility gate for non-radio fields ───────────────────
    // Three systems, checked in order:
    //   1. Radio fields → rendered in their own row, never here
    //   2. disable_when_active → hidden when their class is in disabledClasses
    //   3. switch_button targets → only visible when they match activeSwitchTarget
    //   4. Everything else (incl. class: "manual") → always visible
    const isFieldVisible = (field: Field): boolean => {
        if (field.radio) return false;
        if (!field.class) return true;

        if (disabledClasses.has(field.class)) return false;
        if (switchTargets.has(field.class)) return field.class === activeSwitchTarget;

        return true; // unclassed or non-radio, non-disabled class (e.g. "manual" when --full is off)
    };

    // ── Group all switch_button radios so we render them once ──
    const radioGroups = activeCommand
        ? [...new Set(
            activeCommand.fields
                .filter(f => f.radio && f.class === "switch_button")
                .map(f => f.class)
        )].map(cls =>
            activeCommand.fields.filter(f => f.radio && f.class === cls)
        )
        : [];

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

                                    {/* ── Radio groups (switch_button) ─────────────── */}
                                    {radioGroups.map((group, gi) => (
                                        <div key={gi} className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-mono text-text-faint tracking-[0.12em] uppercase">
                                                Mode
                                            </label>
                                            {/* Segmented-control style row */}
                                            <div className="flex gap-1 bg-surface2 border border-border rounded-[8px] p-1">
                                                {group.map(field => {
                                                    const isActive = fieldValues[field.key] === true;
                                                    return (
                                                        <button
                                                            key={field.key}
                                                            className={`
                                                                flex-1 flex items-center justify-center gap-1.5
                                                                px-3 py-1.5 rounded-[6px]
                                                                text-[11px] font-mono font-medium
                                                                transition-all duration-150
                                                                ${isActive
                                                                    ? "bg-accent text-bg shadow-sm"
                                                                    : "text-text-faint hover:text-text-muted hover:bg-surface3"
                                                                }
                                                            `}
                                                            onClick={() => handleRadioSelect(field)}
                                                        >
                                                            {/* Small dot indicator */}
                                                            <span className={`
                                                                w-1.5 h-1.5 rounded-full shrink-0 transition-all
                                                                ${isActive ? "bg-bg/60" : "bg-text-faint/40"}
                                                            `} />
                                                            {field.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* Show description of the active radio */}
                                            {group.find(f => fieldValues[f.key] === true)?.description && (
                                                <p className="text-[9px] font-mono text-text-faint/70 leading-relaxed px-0.5">
                                                    {group.find(f => fieldValues[f.key] === true)?.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}

                                    {/* ── Regular / class-gated fields ─────────────── */}
                                    <AnimatePresence initial={false}>
                                        {activeCommand.fields.filter(isFieldVisible).map(field => (
                                            <motion.div
                                                key={field.key}
                                                className="flex flex-col gap-1.5"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
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

                                                {field.description && (
                                                    <p className="text-[9px] font-mono text-text-faint/70 leading-relaxed px-0.5">
                                                        {field.description}
                                                    </p>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

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