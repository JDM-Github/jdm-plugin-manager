type Filter = "all" | "update-available";

type Props = {
    filter: Filter;
    totalCount: number;
    updateCount: number;
    onChange: (f: Filter) => void;
};

export function FilterTabs({ filter, totalCount, updateCount, onChange }: Props) {
    const tabs: { key: Filter; label: string }[] = [
        { key: "all", label: `All (${totalCount})` },
        { key: "update-available", label: `Updates (${updateCount})` },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-[8px] w-fit">
            {tabs.map(({ key, label }) => (
                <button
                    key={key}
                    className={`px-3 py-1.5 rounded-[6px] text-[11px] font-mono font-medium transition-colors ${filter === key
                            ? "bg-accent-dim text-accent border border-accent-border"
                            : "text-text-muted hover:text-text border border-transparent"
                        }`}
                    onClick={() => onChange(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}