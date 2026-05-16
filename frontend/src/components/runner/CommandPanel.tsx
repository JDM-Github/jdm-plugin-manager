// ─── components/runner/CommandPanel.tsx ──────────────────────
import type { Command, PluginSchema } from "../../lib/types";

type Props = {
    schema: PluginSchema;
    activeCommand: Command | null;
    panelHeight: string;
    running: boolean;
    onSelect: (cmd: Command) => void;
};

export default function CommandPanel({ schema, activeCommand, panelHeight, running, onSelect }: Props) {
    return (
        <div className={`bg-surface border border-accent-border rounded-[12px] overflow-hidden flex flex-col ${panelHeight}`}>

            {/* Plugin header */}
            <div className="px-4 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[8px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
                        <span className="font-display text-[9px] font-black text-accent tracking-[0.04em]">
                            {schema.namespace.slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-text font-mono leading-tight truncate">
                            {schema.namespace}
                        </div>
                        <div className="text-[9px] font-mono text-text-faint mt-0.5 truncate">
                            {schema.description.slice(0, 32)}{schema.description.length > 32 ? "…" : ""}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable command list */}
            <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-0.5">
                <div className="text-[9px] font-mono text-text-faint tracking-[0.14em] uppercase px-2.5 py-2 shrink-0">
                    Commands
                </div>
                {schema.commands.map(cmd => {
                    const isActive = activeCommand?.name === cmd.name;
                    return (
                        <button
                            key={cmd.name}
                            disabled={running && !isActive}
                            className={`w-full text-left flex items-center gap-3 px-2.5 py-2.5 rounded-[8px] transition-all duration-150 border group/cmd ${isActive
                                    ? "bg-accent-dim border-accent-border"
                                    : running
                                        ? "border-transparent opacity-40 cursor-not-allowed"
                                        : "border-transparent hover:bg-surface3 hover:border-border"
                                }`}
                            onClick={() => !running && onSelect(cmd)}
                        >
                            <span className={`w-[3px] h-4 rounded-full shrink-0 transition-all duration-150 ${isActive ? "bg-accent" : "bg-border group-hover/cmd:bg-border2"}`} />
                            <div className="min-w-0">
                                <div className={`text-[11px] font-mono font-medium transition-colors duration-150 ${isActive ? "text-accent" : "text-text-muted group-hover/cmd:text-text"}`}>
                                    {cmd.name}
                                </div>
                                <div className={`text-[9px] font-mono leading-tight mt-0.5 truncate transition-colors ${isActive ? "text-accent/60" : "text-text-faint"}`}>
                                    {cmd.description}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}