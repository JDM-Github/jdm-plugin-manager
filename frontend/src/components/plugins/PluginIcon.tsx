type Props = { namespace: string };

export function PluginIcon({ namespace }: Props) {
    return (
        <div className="w-9 h-9 rounded-[8px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
            <span className="font-display text-[9px] font-black text-accent tracking-[0.04em]">
                {namespace.slice(0, 2).toUpperCase()}
            </span>
        </div>
    );
}