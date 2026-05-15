import { STATUS_CFG } from "../../lib/constant";
import type { PluginStatus } from "../../lib/types";

type Props = { status: PluginStatus };

export function StatusBadge({ status }: Props) {
    const cfg = STATUS_CFG[status];
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border shrink-0 ${cfg.bg} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-[9px] font-mono font-semibold tracking-[0.08em] ${cfg.color}`}>
                {cfg.label}
            </span>
        </div>
    );
}