import { useState, useRef, useEffect } from "react";

interface Tab {
    id: string;
    label: string;
    running: boolean;
    done: boolean;
    exitOk: boolean;
}

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onClose: (id: string) => void;
    onRename: (id: string, label: string) => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onAdd, onClose, onRename }: TabBarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [alerts, setAlerts] = useState<Record<string, "pos" | "neg">>({});
    const prevTabsRef = useRef<Tab[]>(tabs);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const prev = prevTabsRef.current;
        tabs.forEach(tab => {
            if (tab.id === activeTabId) return;
            const prevTab = prev.find(p => p.id === tab.id);
            if (!prevTab) return;
            if (tab.done && !prevTab.done) {
                setAlerts(a => ({ ...a, [tab.id]: tab.exitOk ? "pos" : "neg" }));
            }
        });
        prevTabsRef.current = tabs;
    }, [tabs, activeTabId]);

    useEffect(() => {
        setAlerts(a => {
            if (!a[activeTabId]) return a;
            const next = { ...a };
            delete next[activeTabId];
            return next;
        });
    }, [activeTabId]);

    const startEdit = (tab: Tab) => {
        setEditingId(tab.id);
        setEditValue(tab.label);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const commitEdit = () => {
        if (editingId) {
            const trimmed = editValue.trim();
            if (trimmed) onRename(editingId, trimmed);
        }
        setEditingId(null);
    };

    const cancelEdit = () => setEditingId(null);

    return (
        <div className="flex items-center gap-1 bg-surface border border-accent-border rounded-[10px] px-2 py-1 overflow-x-auto shrink-0">
            {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                const isEditing = editingId === tab.id;
                const alert = alerts[tab.id];

                return (
                    <div
                        key={tab.id}
                        className={`
                            flex items-center gap-2 px-3 py-1 rounded-[7px] cursor-pointer
                            transition-all shrink-0 border select-none group/tab
                            ${isActive
                                ? "bg-accent-dim border-accent-border"
                                : alert === "pos"
                                    ? "bg-pos/5 border-pos/50 hover:bg-pos/10"
                                    : alert === "neg"
                                        ? "bg-neg/5 border-neg/50 hover:bg-neg/10"
                                        : "border-border/40 hover:bg-surface2 hover:border-border"
                            }
                        `}
                        onClick={() => !isEditing && onSelect(tab.id)}
                        onDoubleClick={() => !tab.running && startEdit(tab)}
                    >
                        {/* Status dot */}
                        {tab.running ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
                        ) : alert ? (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${alert === "pos" ? "bg-pos" : "bg-neg"}`} />
                        ) : null}

                        {isEditing ? (
                            <input
                                ref={inputRef}
                                className="bg-transparent text-[11px] font-mono text-accent outline-none w-24 min-w-0"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                    if (e.key === "Enter") commitEdit();
                                    if (e.key === "Escape") cancelEdit();
                                    e.stopPropagation();
                                }}
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span className={`text-[11px] font-mono transition-colors ${isActive
                                    ? "text-accent"
                                    : alert === "pos"
                                        ? "text-pos"
                                        : alert === "neg"
                                            ? "text-neg"
                                            : "text-text-faint group-hover/tab:text-text-muted"
                                }`}>
                                {tab.label}
                            </span>
                        )}

                        {tabs.length > 1 && !isEditing && (
                            <button
                                className={`
                                    text-[9px] font-mono transition-all shrink-0 cursor-pointer
                                    ${tab.running
                                        ? "opacity-0 pointer-events-none w-3"
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
                           transition-all shrink-0 ml-0.5 cursor-pointer"
                onClick={onAdd}
                title="New session"
            >+</button>
        </div>
    );
}