// ─── AvailableFilterTabs.tsx ──────────────────────────────────
import { FILTER_LABELS, FILTERS } from "../../lib/constant";
import type { AvailableFilter } from "../../lib/constant";

type Props = {
    filter: AvailableFilter;
    onChange: React.Dispatch<React.SetStateAction<AvailableFilter>>
};

export function AvailableFilterTabs({ filter, onChange }: Props) {
    return (
        <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-[8px] flex-wrap">
            {FILTERS.map(f => (
                <button
                    key={f}
                    className={`px-3 py-1.5 rounded-[6px] text-[11px] font-mono font-medium transition-colors border ${filter === f
                            ? "bg-accent-dim text-accent border-accent-border"
                            : "text-text-muted hover:text-text border-transparent"
                        }`}
                    onClick={() => onChange(f)}
                >
                    {FILTER_LABELS[f]}
                </button>
            ))}
        </div>
    );
}