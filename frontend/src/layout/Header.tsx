import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import RequestHandler from "../lib/utilities/request_handler";
import { VERSION } from "../lib/constant";
import { NotificationStore, relativeTime, type Notification } from "../lib/notificationStore";

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

function useNotifications() {
    const [notifs, setNotifs] = useState<Notification[]>([]);
    useEffect(() => {
        const unsub = NotificationStore.subscribe(setNotifs);
        return () => unsub();
    }, []);
    return notifs;
}

// Tick every 30s so relative timestamps stay fresh
function useRelativeTick() {
    const [, tick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => tick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);
}

function NotifIcon({ status }: { status: "success" | "error" }) {
    return status === "success" ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-pos shrink-0 mt-[1px]">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeOpacity="0.4" />
            <path d="M3.5 6l1.8 1.8L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ) : (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-neg shrink-0 mt-[1px]">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeOpacity="0.4" />
            <path d="M4.5 4.5l3 3M7.5 4.5l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

export function Header() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const meta = ROUTE_META[pathname] ?? { title: "jdm" };
    const status = useHealthCheck();
    const cfg = STATUS_CFG[status];
    const notifs = useNotifications();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    useRelativeTick();

    const unread = notifs.length;

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <motion.header
            className="h-[52px] flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-40 shrink-0"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22, delay: 0.05 }}
        >
            {/* Left */}
            <div className="flex items-center gap-2.5">
                <span className="font-display text-[10px] tracking-[0.14em] text-accent glow-accent-text uppercase">
                    JDM Plugin Manager
                </span>
                <span className="w-px h-3 bg-border" />
                <span className="text-[10px] font-mono text-text-faint tracking-[0.08em] uppercase">
                    {meta.title}
                </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">

                {/* Notification bell */}
                <div className="relative" ref={panelRef}>
                    <button
                        className="relative flex items-center justify-center w-7 h-7 rounded-[6px] hover:bg-surface2 transition-colors cursor-pointer"
                        onClick={() => setOpen(o => !o)}
                        title="Notifications"
                        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
                    >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"
                            className={unread > 0 ? "text-accent" : "text-text-faint"}>
                            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7a5.002 5.002 0 0 0-3.005-4.901z" />
                        </svg>
                        <AnimatePresence>
                            {unread > 0 && (
                                <motion.span
                                    key="badge"
                                    className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-accent text-bg text-[8px] font-mono font-bold flex items-center justify-center"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                >
                                    {unread > 9 ? "9+" : unread}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    <AnimatePresence>
                        {open && (
                            <motion.div
                                className="absolute right-0 top-[calc(100%+8px)] w-[300px] bg-surface border border-border rounded-[10px] shadow-2xl overflow-hidden z-50"
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.14, ease: "easeOut" }}
                            >
                                {/* Panel header */}
                                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono tracking-[0.14em] text-text-faint uppercase">
                                            Notifications
                                        </span>
                                        {unread > 0 && (
                                            <span className="px-1.5 py-px rounded-[4px] bg-accent/10 border border-accent/20 text-[8px] font-mono text-accent">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                    {notifs.length > 0 && (
                                        <button
                                            className="text-[9px] font-mono text-text-faint hover:text-neg transition-colors cursor-pointer"
                                            onClick={() => NotificationStore.clear()}
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>

                                {/* List */}
                                <div className="max-h-[260px] overflow-y-auto divide-y divide-border/40">
                                    {notifs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="text-text-faint/20">
                                                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7a5.002 5.002 0 0 0-3.005-4.901z" />
                                            </svg>
                                            <span className="text-[10px] font-mono text-text-faint/40">
                                                No notifications
                                            </span>
                                        </div>
                                    ) : (
                                        notifs.map((n, i) => (
                                            <motion.div
                                                key={n.id}
                                                layout
                                                initial={{ opacity: 0, x: -6 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 6, height: 0 }}
                                                transition={{ duration: 0.14, delay: i * 0.02 }}
                                                className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-surface2 transition-colors cursor-pointer group/notif"
                                                onClick={() => {
                                                    navigate(`/plugin-runner/${n.namespace}`, { state: { tabId: n.tabId } });
                                                    NotificationStore.dismiss(n.id);
                                                    setOpen(false);
                                                }}
                                            >
                                                <NotifIcon status={n.status} />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between gap-1">
                                                        <span className="text-[11px] font-mono text-text truncate">
                                                            {n.tabLabel}
                                                        </span>
                                                        <span className="text-[8px] font-mono text-text-faint/50 shrink-0">
                                                            {relativeTime(n.timestamp)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[9px] font-mono text-text-faint truncate">
                                                            {n.namespace}
                                                        </span>
                                                        <span className="text-text-faint/30 text-[8px]">·</span>
                                                        <span className={`text-[9px] font-mono ${n.status === "success" ? "text-pos/70" : "text-neg/70"}`}>
                                                            {n.status === "success" ? "Completed" : "Failed"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    className="opacity-0 group-hover/notif:opacity-100 p-0.5 rounded text-text-faint/50 hover:text-neg hover:bg-neg/10 transition-all cursor-pointer shrink-0 mt-px"
                                                    onClick={e => { e.stopPropagation(); NotificationStore.dismiss(n.id); }}
                                                    aria-label="Dismiss"
                                                >
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                                                        <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                {notifs.length > 0 && (
                                    <div className="px-3.5 py-2 border-t border-border/60 bg-surface2/40">
                                        <span className="text-[8px] font-mono text-text-faint/30 tracking-[0.08em]">
                                            SHOWING {notifs.length} OF {notifs.length} · MAX 20
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status badge */}
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

                {/* Version */}
                <span className="px-[9px] py-1 rounded-[5px] bg-accent-dim border border-accent-border text-[9px] font-mono text-accent/50 tracking-[0.06em]">
                    v{VERSION}
                </span>
            </div>
        </motion.header>
    );
}

export default Header;