// ─── Footer.tsx ───────────────────────────────────────────────
export default function Footer() {
    return (
        <footer className="h-[40px] flex items-center justify-between px-6 bg-surface border-t border-border shrink-0">
            {/* Left: branding */}
            <div className="flex items-center gap-2">
                <span className="font-display text-[9px] tracking-[0.12em] text-accent glow-accent-text">
                    JDM
                </span>
                <span className="text-[9px] font-mono text-text-faint">·</span>
                <span className="text-[9px] font-mono text-text-faint tracking-[0.06em]">
                    Plugin Manager
                </span>
            </div>
        </footer>
    );
}