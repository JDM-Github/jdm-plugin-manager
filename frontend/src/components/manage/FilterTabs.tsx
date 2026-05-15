import { PartialFilter } from "../../lib/types";

const FILTER_TABS: { value: PartialFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "linked", label: "Linked" },
    { value: "not-linked", label: "Unlinked" },
];

export default function FilterTabs({
    filter, onChange,
}: { filter: PartialFilter; onChange: (f: PartialFilter) => void }) {
    return (
        <div className="flex items-center gap-1 p-[3px] bg-bg border border-border rounded-[8px]">
            {FILTER_TABS.map(tab => (
                <button
                    key={tab.value}
                    className={`relative px-3 py-1 rounded-[6px] text-[10px] font-mono transition-all duration-150
                        ${filter === tab.value
                            ? "text-accent bg-surface border border-border shadow-sm"
                            : "text-text-faint hover:text-text-muted"
                        }`}
                    onClick={() => onChange(tab.value)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}