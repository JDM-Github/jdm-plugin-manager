// ─── SearchBar.tsx ────────────────────────────────────────────
type Props = {
    value: string;
    onChange: (v: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
    return (
        <div className="relative flex-1 max-w-[320px]">
            <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
                width="13" height="13" viewBox="0 0 13 13"
                fill="none" stroke="currentColor" strokeWidth="1.5"
            >
                <circle cx="5.5" cy="5.5" r="4" />
                <path d="M8.5 8.5l2.5 2.5" strokeLinecap="round" />
            </svg>
            <input
                className="w-full bg-surface border border-border rounded-[7px] pl-8 pr-3 py-2 text-[12px] font-mono text-text outline-none focus:border-accent/50 transition-colors placeholder:text-text-faint"
                placeholder="Search plugins..."
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}