// ─── Header.tsx ───────────────────────────────────────────────
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import RequestHandler from "../lib/utilities/request_handler";
import { VERSION } from "../lib/constant";

const ROUTE_META: Record<string, { title: string }> = {
    "/": { title: "Overview" },
    "/plugins": { title: "Installed Plugins" },
    "/available": { title: "Available Plugins" },
    "/settings": { title: "Settings" },
};

type HealthStatus = "checking" | "online" | "offline";

const STATUS_CFG: Record<
    HealthStatus,
    { label: string; dotClass: string; textClass: string; borderClass: string; ping: boolean }
> = {
    checking: {
        label: "CHECKING",
        dotClass: "bg-neu",
        textClass: "text-neu",
        borderClass: "border-neu/20",
        ping: true,
    },
    online: {
        label: "API ONLINE",
        dotClass: "bg-pos",
        textClass: "text-pos",
        borderClass: "border-pos/20",
        ping: true,
    },
    offline: {
        label: "API OFFLINE",
        dotClass: "bg-neg",
        textClass: "text-neg",
        borderClass: "border-neg/20",
        ping: false,
    },
};

const POLL_MS = 20_000;

function useHealthCheck() {
    const [status, setStatus] = useState<HealthStatus>("checking");
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const check = async () => {
        try {
            const data = await RequestHandler.fetchData("GET", "health");
            setStatus(data?.success === false ? "offline" : "online");
        } catch {
            setStatus("offline");
        }
    };

    useEffect(() => {
        check();
        timer.current = setInterval(check, POLL_MS);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, []);

    return status;
}

function StatusDot({ dotClass, ping }: { dotClass: string; ping: boolean }) {
    return (
        <span className="relative inline-flex w-1.5 h-1.5">
            {ping && (
                <span className={`absolute inset-0 rounded-full opacity-40 animate-health-ping ${dotClass}`} />
            )}
            <span className={`relative inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} />
        </span>
    );
}

export function Header() {
    const { pathname } = useLocation();
    const meta = ROUTE_META[pathname] ?? { title: "jdm" };
    const status = useHealthCheck();
    const cfg = STATUS_CFG[status];

    return (
        <motion.header
            className="h-[52px] flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-40 shrink-0"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22, delay: 0.05 }}
        >
            {/* Left — breadcrumb */}
            <div className="flex items-center gap-2">
                <span className="font-display text-[10px] tracking-[0.12em] text-accent glow-accent-text">
                    JDM PLUGIN MANAGER
                </span>
                <span className="text-[10px] font-mono text-text-faint">/</span>
                <span className="text-[11px] font-mono text-text-muted tracking-[0.06em] uppercase">
                    {meta.title}
                </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={status}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-accent-dim border text-[9px] font-mono tracking-[0.08em] ${cfg.textClass} ${cfg.borderClass}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.12 }}
                    >
                        <StatusDot dotClass={cfg.dotClass} ping={cfg.ping} />
                        {cfg.label}
                    </motion.div>
                </AnimatePresence>

                <span className="px-[9px] py-1 rounded-[5px] bg-accent-dim border border-accent-border text-[9px] font-mono text-accent/50 tracking-[0.06em]">
                    v{VERSION}
                </span>
            </div>
        </motion.header>
    );
}

export default Header;