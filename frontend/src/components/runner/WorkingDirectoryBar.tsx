interface WorkingDirectoryBarProps {
    workDir: string;
    setWorkDir: (dir: string) => void;
    loading: boolean;
    onFetchCwd: () => void;
    onBrowseFolder: () => void;
}

export default function WorkingDirectoryBar({
    workDir, setWorkDir, loading, onFetchCwd, onBrowseFolder
}: WorkingDirectoryBarProps) {
    return (
        <div className="flex items-center gap-2 bg-surface border border-accent-border rounded-[10px] px-3 py-2">
            <span className="text-[9px] font-mono text-text-faint tracking-[0.12em] uppercase shrink-0">cwd</span>
            <span className="w-px h-3 bg-border shrink-0" />
            <input
                className="flex-1 bg-transparent text-[11px] font-mono text-text-muted outline-none placeholder:text-text-faint/40 min-w-0"
                placeholder="No path set — plugin will use server cwd"
                value={workDir}
                onChange={e => setWorkDir(e.target.value)}
                spellCheck={false}
            />
            {workDir && (
                <button
                    className="text-[9px] font-mono text-text-faint hover:text-neg transition-colors shrink-0"
                    onClick={() => setWorkDir("")}
                    title="Clear path"
                >✕</button>
            )}
            <span className="w-px h-3 bg-border shrink-0" />
            <button
                className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-[6px] border transition-all shrink-0 ${loading
                        ? "border-border text-text-faint cursor-wait"
                        : "border-border hover:border-accent/40 hover:text-accent text-text-faint"
                    }`}
                onClick={onFetchCwd}
                disabled={loading}
                title="Auto-detect from last active VS Code project or Explorer folder"
            >
                {loading ? (
                    <span className="w-2.5 h-2.5 rounded-full border border-t-accent border-text-faint/30 animate-spin" />
                ) : "⊙"}
                Auto
            </button>
            <button
                className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-[6px] border border-border hover:border-accent/40 hover:text-accent text-text-faint transition-all shrink-0"
                onClick={onBrowseFolder}
                title="Browse for folder"
            >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.086a1.5 1.5 0 0 1 1.06.44L7.707 3.5H13.5A1.5 1.5 0 0 1 15 5v7.5A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                </svg>
                Browse
            </button>
        </div>
    );
}