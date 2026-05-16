
interface Tab {
    id: string;
    label: string;
    running: boolean;
}

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onClose: (id: string) => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onAdd, onClose }: TabBarProps) {
    return (
        <div className="flex items-center gap-1 bg-surface border border-accent-border rounded-[10px] px-2 py-1 overflow-x-auto shrink-0">
            {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                return (
                    <div
                        key={tab.id}
                        className={`
                            flex items-center gap-2 px-3 py-1 rounded-[7px] cursor-pointer
                            transition-all shrink-0 border select-none group/tab
                            ${isActive
                                ? "bg-accent-dim border-accent-border"
                                : "border-transparent hover:bg-surface2 hover:border-border"
                            }
                        `}
                        onClick={() => onSelect(tab.id)}
                    >
                        {/* Live indicator */}
                        {tab.running && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
                        )}

                        <span className={`text-[11px] font-mono transition-colors ${isActive ? "text-accent" : "text-text-faint group-hover/tab:text-text-muted"
                            }`}>
                            {tab.label}
                        </span>

                        {tabs.length > 1 && (
                            <button
                                className={`
                                    text-[9px] font-mono transition-all shrink-0
                                    ${tab.running
                                        ? "opacity-0 pointer-events-none w-3"  // placeholder width so tab doesn't jump
                                        : isActive
                                            ? "text-accent/50 hover:text-neg opacity-100"
                                            : "text-text-faint/0 group-hover/tab:text-text-faint/60 hover:!text-neg"
                                    }
                                `}
                                onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                                title="Close session"
                            >✕</button>
                        )}
                    </div>
                );
            })}

            <button
                className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[14px]
                           font-mono text-text-faint hover:text-text hover:bg-surface2
                           transition-all shrink-0 ml-0.5"
                onClick={onAdd}
                title="New session"
            >+</button>
        </div>
    );
}