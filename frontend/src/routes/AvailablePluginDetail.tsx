// // ─── AvailablePluginDetail.tsx ────────────────────────────────
// import { useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { motion, AnimatePresence } from "framer-motion";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import type { AvailablePlugin } from "../lib/types";
// import RequestHandler from "../lib/utilities/request_handler";
// import Breadcrumb from "../components/Breadcrumb";

// function OfficialBadge() {
//     return (
//         <span className="inline-flex items-center gap-[3px] px-1.5 py-[3px] rounded-full bg-accent/10 border border-accent/25 text-accent text-[8px] font-mono font-bold tracking-wider uppercase shrink-0">
//             <svg width="7" height="7" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
//                 <path d="M8 0l1.8 5.4H16l-4.7 3.4 1.8 5.5L8 11l-5.1 3.3 1.8-5.5L0 5.4h6.2z" />
//             </svg>
//             Official
//         </span>
//     );
// }

// export default function AvailablePluginDetail() {
//     const location = useLocation();
//     const navigate = useNavigate();
//     const plugin = location.state?.plugin as AvailablePlugin | undefined;

//     const [current, setCurrent] = useState<AvailablePlugin | undefined>(plugin);
//     const [pending, setPending] = useState(false);
//     const [toast, setToast] = useState<{ message: string; type: "success" | "neg" } | null>(null);
//     const [linkOpen, setLinkOpen] = useState(false);
//     const [linkPath, setLinkPath] = useState("");
//     const [linkError, setLinkError] = useState<string | null>(null);

//     if (!current) {
//         return (
//             <div className="flex flex-col items-center justify-center h-64 gap-4">
//                 <span className="text-[11px] font-mono text-text-faint">Plugin not found.</span>
//                 <button
//                     className="text-[10px] font-mono text-accent hover:opacity-75 transition-opacity"
//                     onClick={() => navigate("/available")}
//                 >
//                     ← Back to Available
//                 </button>
//             </div>
//         );
//     }

//     // ── Helpers ───────────────────────────────────────────────

//     const showToast = (message: string, type: "success" | "neg") => {
//         setToast({ message, type });
//         setTimeout(() => setToast(null), 2500);
//     };

//     // ── Handlers ──────────────────────────────────────────────

//     const handleInstall = async () => {
//         setPending(true);
//         try {
//             const res = await RequestHandler.fetchData("POST", "plugin/install", { package: current.package });
//             if (res.success) {
//                 setCurrent(p => p ? { ...p, installed: true, installedVersion: res.data.version ?? null, linked: false, localPath: null } : p);
//                 showToast(`${current.package} installed`, "success");
//             } else {
//                 showToast(res.message ?? "Failed to install", "neg");
//             }
//         } catch (err: any) {
//             showToast(err.message ?? "Failed to install", "neg");
//         } finally {
//             setPending(false);
//         }
//     };

//     const handleRemove = async () => {
//         setPending(true);
//         try {
//             const res = await RequestHandler.fetchData("POST", `plugin/delete/${current.namespace}`);
//             if (res.success) {
//                 setCurrent(p => p ? { ...p, installed: false, installedVersion: null, linked: false, localPath: null } : p);
//                 showToast(`${current.package} removed`, "neg");
//             } else {
//                 showToast(res.message ?? "Failed to remove", "neg");
//             }
//         } catch (err: any) {
//             showToast(err.message ?? "Failed to remove", "neg");
//         } finally {
//             setPending(false);
//         }
//     };

//     const handleLinkConfirm = async () => {
//         if (!linkPath.trim()) { setLinkError("Local path is required"); return; }
//         setLinkOpen(false);
//         setPending(true);
//         try {
//             const res = await RequestHandler.fetchData("POST", "plugin/link", {
//                 package: current.package,
//                 localPath: linkPath.trim(),
//             });
//             if (res.success) {
//                 setCurrent(p => p ? { ...p, installed: true, installedVersion: res.data.version ?? null, linked: true, localPath: linkPath.trim() } : p);
//                 showToast(`${current.package} linked`, "success");
//             } else {
//                 showToast(res.message ?? "Failed to link", "neg");
//             }
//         } catch (err: any) {
//             showToast(err.message ?? "Failed to link", "neg");
//         } finally {
//             setPending(false);
//             setLinkPath("");
//         }
//     };

//     // ── Derived ───────────────────────────────────────────────

//     const initials = current.namespace.slice(0, 2).toUpperCase();
//     const versionLabel = current.installed && current.installedVersion
//         ? current.installedVersion
//         : current.npmVersion ?? null;

//     // ── Render ────────────────────────────────────────────────

//     return (
//         <>
//             <motion.div
//                 className="flex flex-col gap-4 max-w-full h-[calc(100vh-150px)]"
//                 initial={{ opacity: 0, y: 8 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.2, ease: "easeOut" }}
//             >
//                 <Breadcrumb
//                     namespace={current.namespace}
//                     commandCount={current.commands.length}
//                     activeCommand={null}
//                     onBack={() => navigate("/available")}
//                     textBreadcrumb={"Available"}
//                 />

//                 {/* ── Two-column layout ── */}
//                 <div className="flex gap-4 items-start flex-col lg:flex-row h-full min-h-0">

//                     {/* ══ LEFT — main content (scrollable) ══════════════════════════════ */}
//                     <div className="flex flex-col gap-4 flex-1 min-w-0 h-full overflow-y-auto pr-1 custom-scroll">

//                         {/* ── Identity card ── */}
//                         <div className="bg-surface border border-border rounded-[14px] overflow-hidden shrink-0">
//                             <div className="h-[2px] w-full bg-accent opacity-50" />
//                             <div className="p-5 flex items-center gap-4">
//                                 {/* Icon */}
//                                 <div className="w-[54px] h-[54px] rounded-[13px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
//                                     <span className="font-display text-[15px] font-black text-accent tracking-[0.04em]">
//                                         {initials}
//                                     </span>
//                                 </div>

//                                 {/* Name block */}
//                                 <div className="flex flex-col gap-1 min-w-0 flex-1">
//                                     <div className="flex items-center gap-2 flex-wrap">
//                                         <span className="text-[15px] font-bold font-mono text-text leading-tight">
//                                             {current.package}
//                                         </span>
//                                         {current.official &&
//                                             <OfficialBadge />
//                                         }
//                                         {current.linked && (
//                                             <span className="text-[8px] font-mono font-bold text-accent bg-accent-dim border border-accent-border px-1.5 py-[3px] rounded-[4px] tracking-[0.1em]">
//                                                 LINKED
//                                             </span>
//                                         )}
//                                     </div>
//                                     <p className="text-[11px] font-mono text-text-muted leading-relaxed">
//                                         {current.description}
//                                     </p>
//                                     {/* Meta row */}
//                                     <div className="flex items-center gap-2 flex-wrap mt-0.5">
//                                         <span className="text-[9px] font-mono text-text-faint">{current.namespace}</span>
//                                         {versionLabel && (
//                                             <>
//                                                 <span className="text-text-faint/30 text-[9px]">·</span>
//                                                 <span className="text-[9px] font-mono text-accent/70">v{versionLabel}</span>
//                                             </>
//                                         )}
//                                         {current.weeklyDownloads != null && (
//                                             <>
//                                                 <span className="text-text-faint/30 text-[9px]">·</span>
//                                                 <span className="text-[9px] font-mono text-text-faint">
//                                                     {current.weeklyDownloads.toLocaleString()} downloads/wk
//                                                 </span>
//                                             </>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Commands strip */}
//                             {current.commands.length > 0 && (
//                                 <div className="border-t border-border px-5 py-3 flex items-center gap-2 flex-wrap bg-bg/40">
//                                     <span className="text-[9px] font-mono text-text-faint tracking-[0.1em] uppercase shrink-0">
//                                         Commands
//                                     </span>
//                                     <span className="text-text-faint/20 text-[9px] shrink-0">·</span>
//                                     {current.commands.map(cmd => (
//                                         <code
//                                             key={cmd}
//                                             className="text-[9px] font-mono text-text-muted bg-surface border border-border px-1.5 py-[2px] rounded-[3px]"
//                                         >
//                                             jdm {current.namespace} {cmd}
//                                         </code>
//                                     ))}
//                                 </div>
//                             )}

//                             {/* Linked path strip */}
//                             {current.linked && current.localPath && (
//                                 <div className="border-t border-border px-5 py-3 flex items-center gap-2 bg-accent/5">
//                                     <span className="text-[9px] font-mono text-text-faint tracking-[0.06em] uppercase shrink-0">
//                                         Local path
//                                     </span>
//                                     <span className="text-text-faint/20 text-[9px] shrink-0">·</span>
//                                     <span className="text-[10px] font-mono text-accent/70 truncate">
//                                         {current.localPath}
//                                     </span>
//                                 </div>
//                             )}
//                         </div>

//                         {/* ── Readme ── */}
//                         <div className="bg-surface border border-border rounded-[14px] overflow-hidden shrink-0">
//                             <div className="px-5 py-3 border-b border-border flex items-center gap-2">
//                                 <span className="text-[9px] font-mono text-text-faint tracking-[0.14em] uppercase">
//                                     Readme
//                                 </span>
//                             </div>
//                             <div className="p-5">
//                                 {current.readme ? (
//                                     <div className="readme-prose">
//                                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
//                                             {current.readme}
//                                         </ReactMarkdown>
//                                     </div>
//                                 ) : (
//                                     <span className="text-[11px] font-mono text-text-faint italic">
//                                         No readme available.
//                                     </span>
//                                 )}
//                             </div>
//                         </div>
//                     </div>

//                     {/* ══ RIGHT — sticky sidebar ═══════════════════════════ */}
//                     <div className="flex flex-col gap-3 w-full lg:w-[220px] shrink-0 lg:sticky lg:top-4">

//                         {/* Action card */}
//                         <div className="bg-surface border border-border rounded-[14px] p-4 flex flex-col gap-3">
//                             {current.installed ? (
//                                 <>
//                                     <div className="flex items-center gap-1.5">
//                                         <span className="w-1.5 h-1.5 rounded-full bg-pos shrink-0" />
//                                         <span className="text-[10px] font-mono text-pos">
//                                             {current.linked ? "Linked locally" : "Installed"}
//                                         </span>
//                                     </div>
//                                     <button
//                                         className="w-full py-2 rounded-[8px] border border-border text-text-faint text-[11px] font-mono hover:border-neg hover:text-neg transition-colors active:scale-[0.98] disabled:opacity-40"
//                                         onClick={handleRemove}
//                                         disabled={pending}
//                                     >
//                                         {pending ? "···" : "Remove"}
//                                     </button>
//                                 </>
//                             ) : (
//                                 <>
//                                     <button
//                                         className="w-full py-2 rounded-[8px] bg-accent text-bg text-[11px] font-mono font-bold tracking-[0.04em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40"
//                                         onClick={handleInstall}
//                                         disabled={pending}
//                                     >
//                                         {pending ? "···" : "+ Install"}
//                                     </button>
//                                     <button
//                                         className="w-full py-2 rounded-[8px] border border-border text-text-faint text-[11px] font-mono hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98] disabled:opacity-40"
//                                         onClick={() => { setLinkError(null); setLinkPath(""); setLinkOpen(true); }}
//                                         disabled={pending}
//                                     >
//                                         ⇄ Link local
//                                     </button>
//                                 </>
//                             )}
//                         </div>

//                         {/* Stats card */}
//                         <div className="bg-surface border border-border rounded-[14px] overflow-hidden">
//                             <div className="px-4 py-3 border-b border-border">
//                                 <span className="text-[9px] font-mono text-text-faint tracking-[0.12em] uppercase">Info</span>
//                             </div>
//                             <div className="divide-y divide-border">
//                                 <StatRow label="Package" value={current.package} mono />
//                                 <StatRow label="Namespace" value={current.namespace} mono />
//                                 <StatRow
//                                     label="npm version"
//                                     value={current.npmVersion ? `v${current.npmVersion}` : "—"}
//                                     mono
//                                 />
//                                 <StatRow
//                                     label="Installed"
//                                     value={current.installedVersion ? `v${current.installedVersion}` : "—"}
//                                     mono
//                                 />
//                                 <StatRow
//                                     label="Downloads/wk"
//                                     value={current.weeklyDownloads != null
//                                         ? current.weeklyDownloads.toLocaleString()
//                                         : "—"
//                                     }
//                                 />
//                                 <StatRow
//                                     label="Status"
//                                     value={
//                                         !current.installed ? "Not installed"
//                                             : current.linked ? "Linked"
//                                                 : "Installed"
//                                     }
//                                     accent={current.installed}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </motion.div>

//             {/* ── Link modal ── */}
//             <AnimatePresence>
//                 {linkOpen && (
//                     <motion.div
//                         className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
//                         initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//                         onClick={() => setLinkOpen(false)}
//                     >
//                         <motion.div
//                             className="bg-surface border border-border rounded-[14px] p-5 w-full max-w-sm flex flex-col gap-4 mx-4"
//                             initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
//                             onClick={e => e.stopPropagation()}
//                         >
//                             <div className="flex flex-col gap-1">
//                                 <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">
//                                     Link local plugin
//                                 </h2>
//                                 <p className="text-[11px] font-mono text-text-muted">{current.package}</p>
//                             </div>
//                             <div className="flex flex-col gap-1.5">
//                                 <label className="text-[10px] font-mono text-text-faint">Local path</label>
//                                 <input
//                                     autoFocus
//                                     className="w-full bg-bg border border-border rounded-[7px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
//                                     placeholder="C:\projects\my-plugin"
//                                     value={linkPath}
//                                     onChange={e => { setLinkPath(e.target.value); setLinkError(null); }}
//                                     onKeyDown={e => e.key === "Enter" && handleLinkConfirm()}
//                                 />
//                                 {linkError && (
//                                     <span className="text-[10px] font-mono text-red-400">{linkError}</span>
//                                 )}
//                             </div>
//                             <div className="flex gap-2 justify-end">
//                                 <button
//                                     className="px-3 py-1.5 rounded-[7px] border border-border text-text-faint text-[10px] font-mono hover:text-text transition-colors"
//                                     onClick={() => setLinkOpen(false)}
//                                 >
//                                     Cancel
//                                 </button>
//                                 <button
//                                     className="px-3 py-1.5 rounded-[7px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity"
//                                     onClick={handleLinkConfirm}
//                                 >
//                                     Link
//                                 </button>
//                             </div>
//                         </motion.div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             {/* ── Toast ── */}
//             <AnimatePresence>
//                 {toast && (
//                     <motion.div
//                         className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[8px] border text-[11px] font-mono whitespace-nowrap
//                             ${toast.type === "success"
//                                 ? "bg-surface border-pos/30 text-pos"
//                                 : "bg-surface border-neg/30 text-neg"
//                             }`}
//                         initial={{ opacity: 0, y: 8 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: 8 }}
//                     >
//                         {toast.message}
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </>
//     );
// }

// // ── StatRow ───────────────────────────────────────────────────

// function StatRow({
//     label,
//     value,
//     mono = false,
//     accent = false,
// }: {
//     label: string;
//     value: string;
//     mono?: boolean;
//     accent?: boolean;
// }) {
//     return (
//         <div className="flex items-center justify-between gap-3 px-4 py-2.5">
//             <span className="text-[9px] font-mono text-text-faint tracking-[0.06em] uppercase shrink-0">
//                 {label}
//             </span>
//             <span className={`text-[10px] truncate text-right ${mono ? "font-mono" : ""} ${accent ? "text-pos" : "text-text-muted"}`}>
//                 {value}
//             </span>
//         </div>
//     );
// }
// ─── AvailablePluginDetail.tsx ────────────────────────────────
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AvailablePlugin } from "../lib/types";
import RequestHandler from "../lib/utilities/request_handler";
import Breadcrumb from "../components/Breadcrumb";
import { clearCache } from "../hooks/usePluginCache";

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

interface PluginVersion {
    version: string;
    description: string;
    commands: string[];
    submitted_by: string;
    is_official: boolean;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });
    } catch { return iso; }
}

function relativeTime(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return "today";
        if (days === 1) return "yesterday";
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        if (days < 365) return `${Math.floor(days / 30)}mo ago`;
        return `${Math.floor(days / 365)}y ago`;
    } catch { return ""; }
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

function OfficialBadge() {
    return (
        <span className="inline-flex items-center gap-[3px] px-1.5 py-[3px] rounded-full bg-accent/10 border border-accent/25 text-accent text-[8px] font-mono font-bold tracking-wider uppercase shrink-0">
            <svg width="7" height="7" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0l1.8 5.4H16l-4.7 3.4 1.8 5.5L8 11l-5.1 3.3 1.8-5.5L0 5.4h6.2z" />
            </svg>
            Official
        </span>
    );
}

function Spinner({ size = 11 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 20" className="opacity-30" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

function StatRow({ label, value, mono = false, accent = false }: {
    label: string; value: string; mono?: boolean; accent?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-[9px] font-mono text-text-faint tracking-[0.06em] uppercase shrink-0">{label}</span>
            <span className={`text-[10px] truncate text-right ${mono ? "font-mono" : ""} ${accent ? "text-pos" : "text-text-muted"}`}>
                {value}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────

export default function AvailablePluginDetail() {
    const location = useLocation();
    const navigate = useNavigate();
    const plugin = location.state?.plugin as AvailablePlugin | undefined;

    const [current, setCurrent] = useState<AvailablePlugin | undefined>(plugin);
    const [pending, setPending] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "neg" } | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkPath, setLinkPath] = useState("");
    const [linkError, setLinkError] = useState<string | null>(null);

    // ── Version history state ─────────────────────────────────
    const [versions, setVersions] = useState<PluginVersion[]>([]);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const [versionsError, setVersionsError] = useState<string | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [versionsOpen, setVersionsOpen] = useState(false);

    // ── Load version history ──────────────────────────────────
    useEffect(() => {
        if (!current) return;
        setVersionsLoading(true);
        setVersionsError(null);
        RequestHandler.fetchData("GET", `plugin/available/${current.namespace}/versions`)
            .then(res => {
                if (res.success) {
                    setVersions(res.data.versions ?? []);
                } else {
                    setVersionsError(res.message ?? "Failed to load versions");
                }
            })
            .catch(err => setVersionsError(err.message ?? "Failed to load versions"))
            .finally(() => setVersionsLoading(false));
    }, [current?.namespace]);

    if (!current) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <span className="text-[11px] font-mono text-text-faint">Plugin not found.</span>
                <button
                    className="text-[10px] font-mono text-accent hover:opacity-75 transition-opacity"
                    onClick={() => navigate("/available")}
                >
                    ← Back to Available
                </button>
            </div>
        );
    }

    // ── Helpers ───────────────────────────────────────────────

    const showToast = (message: string, type: "success" | "neg") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

    // ── Derived ───────────────────────────────────────────────

    const initials = current.namespace.slice(0, 2).toUpperCase();
    const latestLabel = current.npmVersion ?? current.latestVersion ?? null;
    const versionLabel = current.installed && current.installedVersion
        ? current.installedVersion
        : latestLabel;

    const hasUpdate =
        current.installed &&
        !!current.installedVersion &&
        !!latestLabel &&
        current.installedVersion !== latestLabel;

    const isLatestSelected = !selectedVersion || selectedVersion === versions[0]?.version;
    const selectedVersionInfo = selectedVersion
        ? versions.find(v => v.version === selectedVersion) ?? null
        : null;

    const handleInstall = async (versionOverride?: string) => {
        setPending(true);
        const pkg = versionOverride
            ? `${current.package}@${versionOverride}`
            : current.package;
        try {
            const res = await RequestHandler.fetchData("POST", "plugin/install", { package: pkg });
            if (res.success) {
                setCurrent(p => p ? {
                    ...p,
                    installed: true,
                    installedVersion: res.data.version ?? versionOverride ?? null,
                    linked: false,
                    localPath: null,
                } : p);
                showToast(`${current.package}${versionOverride ? ` v${versionOverride}` : ""} installed`, "success");
                setSelectedVersion(null);
                await clearCache();
            } else {
                showToast(res.message ?? "Failed to install", "neg");
            }
        } catch (err: any) {
            showToast(err.message ?? "Failed to install", "neg");
        } finally {
            setPending(false);
        }
    };

    const handleRemove = async () => {
        setPending(true);
        try {
            const res = await RequestHandler.fetchData("POST", `plugin/delete/${current.namespace}`);
            if (res.success) {
                setCurrent(p => p ? { ...p, installed: false, installedVersion: null, linked: false, localPath: null } : p);
                showToast(`${current.package} removed`, "neg");
                await clearCache();
            } else {
                showToast(res.message ?? "Failed to remove", "neg");
            }
        } catch (err: any) {
            showToast(err.message ?? "Failed to remove", "neg");
        } finally {
            setPending(false);
        }
    };

    const handleLinkConfirm = async () => {
        if (!linkPath.trim()) { setLinkError("Local path is required"); return; }
        setLinkOpen(false);
        setPending(true);
        try {
            const res = await RequestHandler.fetchData("POST", "plugin/link", {
                package: current.package,
                localPath: linkPath.trim(),
            });
            if (res.success) {
                setCurrent(p => p ? { ...p, installed: true, installedVersion: res.data.version ?? null, linked: true, localPath: linkPath.trim() } : p);
                showToast(`${current.package} linked`, "success");
                await clearCache();
            } else {
                showToast(res.message ?? "Failed to link", "neg");
            }
        } catch (err: any) {
            showToast(err.message ?? "Failed to link", "neg");
        } finally {
            setPending(false);
            setLinkPath("");
        }
    };

    // ── Render ────────────────────────────────────────────────

    return (
        <>
            <motion.div
                className="flex flex-col gap-4 max-w-full h-[calc(100vh-150px)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
            >
                <Breadcrumb
                    namespace={current.namespace}
                    commandCount={current.commands.length}
                    activeCommand={null}
                    onBack={() => navigate("/available")}
                    textBreadcrumb={"Available"}
                />

                {/* ── Two-column layout ── */}
                <div className="flex gap-4 items-start flex-col lg:flex-row h-full min-h-0">

                    {/* ══ LEFT — main content (scrollable) ══════════════════ */}
                    <div className="flex flex-col gap-4 flex-1 min-w-0 h-full overflow-y-auto pr-1 custom-scroll">

                        {/* ── Identity card ── */}
                        <div className="bg-surface border border-border rounded-[14px] overflow-hidden shrink-0">
                            <div className="h-[2px] w-full bg-accent opacity-50" />
                            <div className="p-5 flex items-center gap-4">
                                <div className="w-[54px] h-[54px] rounded-[13px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
                                    <span className="font-display text-[15px] font-black text-accent tracking-[0.04em]">{initials}</span>
                                </div>
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[15px] font-bold font-mono text-text leading-tight">{current.package}</span>
                                        {current.official && <OfficialBadge />}
                                        {current.linked && (
                                            <span className="text-[8px] font-mono font-bold text-accent bg-accent-dim border border-accent-border px-1.5 py-[3px] rounded-[4px] tracking-[0.1em]">
                                                LINKED
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                                        {selectedVersionInfo?.description || current.description}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <span className="text-[9px] font-mono text-text-faint">{current.namespace}</span>
                                        {versionLabel && (
                                            <>
                                                <span className="text-text-faint/30 text-[9px]">·</span>
                                                <span className="text-[9px] font-mono text-accent/70">v{versionLabel}</span>
                                                {hasUpdate && (
                                                    <span className="text-[9px] font-mono text-amber-400/70" title={`Latest: v${latestLabel}`}>
                                                        → v{latestLabel}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {current.weeklyDownloads != null && (
                                            <>
                                                <span className="text-text-faint/30 text-[9px]">·</span>
                                                <span className="text-[9px] font-mono text-text-faint">
                                                    {current.weeklyDownloads.toLocaleString()} downloads/wk
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Commands strip — reflects selected version */}
                            {(selectedVersionInfo?.commands ?? current.commands).length > 0 && (
                                <div className="border-t border-border px-5 py-3 flex items-center gap-2 flex-wrap bg-bg/40">
                                    <span className="text-[9px] font-mono text-text-faint tracking-[0.1em] uppercase shrink-0">Commands</span>
                                    <span className="text-text-faint/20 text-[9px] shrink-0">·</span>
                                    {(selectedVersionInfo?.commands ?? current.commands).map(cmd => (
                                        <code
                                            key={cmd}
                                            className="text-[9px] font-mono text-text-muted bg-surface border border-border px-1.5 py-[2px] rounded-[3px]"
                                        >
                                            jdm {current.namespace} {cmd}
                                        </code>
                                    ))}
                                </div>
                            )}

                            {/* Linked path strip */}
                            {current.linked && current.localPath && (
                                <div className="border-t border-border px-5 py-3 flex items-center gap-2 bg-accent/5">
                                    <span className="text-[9px] font-mono text-text-faint tracking-[0.06em] uppercase shrink-0">Local path</span>
                                    <span className="text-text-faint/20 text-[9px] shrink-0">·</span>
                                    <span className="text-[10px] font-mono text-accent/70 truncate">{current.localPath}</span>
                                </div>
                            )}
                        </div>

                        {/* ── Version history ── */}
                        <div className="bg-surface border border-border rounded-[14px] overflow-hidden shrink-0">
                            <button
                                className="w-full flex items-center justify-between px-5 py-3 border-b border-border hover:bg-accent-dim/30 transition-colors duration-150"
                                onClick={() => setVersionsOpen(v => !v)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-text-faint tracking-[0.14em] uppercase">
                                        Version History
                                    </span>
                                    {!versionsLoading && versions.length > 0 && (
                                        <span className="text-[8px] font-mono px-1.5 py-[2px] rounded-[3px] bg-accent-dim border border-accent-border text-accent/60">
                                            {versions.length}
                                        </span>
                                    )}
                                    {selectedVersion && (
                                        <span className="text-[8px] font-mono px-1.5 py-[2px] rounded-[3px] bg-amber-400/10 border border-amber-400/20 text-amber-400/80">
                                            v{selectedVersion} selected
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-mono text-text-faint transition-transform duration-200" style={{ display: "inline-block", transform: versionsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                                    ▾
                                </span>
                            </button>

                            <AnimatePresence initial={false}>
                                {versionsOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        {versionsLoading ? (
                                            <div className="flex items-center justify-center gap-2 py-8 text-[11px] font-mono text-text-faint">
                                                <Spinner size={11} />
                                                <span>Loading versions…</span>
                                            </div>
                                        ) : versionsError ? (
                                            <div className="px-5 py-4 text-[11px] font-mono text-neg/70">{versionsError}</div>
                                        ) : versions.length === 0 ? (
                                            <div className="px-5 py-4 text-[11px] font-mono text-text-faint italic">No versions found.</div>
                                        ) : (
                                            <div className="divide-y divide-border">
                                                {versions.map((v, i) => {
                                                    const isSelected = selectedVersion === v.version;
                                                    const isLatest = i === 0;
                                                    const isInstalled = current.installedVersion === v.version;

                                                    return (
                                                        <motion.div
                                                            key={v.version}
                                                            initial={{ opacity: 0, x: -4 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ duration: 0.15, delay: i * 0.03 }}
                                                            className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors duration-150 group
                                                                ${isSelected ? "bg-accent-dim/60" : "hover:bg-accent-dim/30"}`}
                                                            onClick={() => setSelectedVersion(isSelected ? null : v.version)}
                                                        >
                                                            {/* Selection indicator */}
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150
                                                                ${isSelected ? "bg-accent" : isInstalled ? "bg-pos" : "bg-border"}`}
                                                            />

                                                            {/* Version + badges */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`text-[11px] font-mono font-semibold transition-colors duration-150
                                                                        ${isSelected ? "text-accent" : "text-text group-hover:text-accent"}`}>
                                                                        v{v.version}
                                                                    </span>
                                                                    {isLatest && (
                                                                        <span className="text-[7px] font-mono px-1 py-[1px] rounded-[3px] bg-accent/10 border border-accent/20 text-accent/70 tracking-wider uppercase">
                                                                            latest
                                                                        </span>
                                                                    )}
                                                                    {isInstalled && (
                                                                        <span className="text-[7px] font-mono px-1 py-[1px] rounded-[3px] bg-pos/10 border border-pos/20 text-pos tracking-wider uppercase">
                                                                            installed
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-[2px]">
                                                                    <span className="text-[9px] font-mono text-text-faint/60">{v.submitted_by}</span>
                                                                    <span className="text-text-faint/30 text-[9px]">·</span>
                                                                    <span className="text-[9px] font-mono text-text-faint/50" title={formatDate(v.created_at)}>
                                                                        {relativeTime(v.created_at)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Commands count */}
                                                            {v.commands.length > 0 && (
                                                                <span className="text-[9px] font-mono text-text-faint/50 shrink-0">
                                                                    {v.commands.length} cmd{v.commands.length !== 1 ? "s" : ""}
                                                                </span>
                                                            )}

                                                            {/* Select chevron */}
                                                            <span className={`text-[9px] font-mono shrink-0 transition-colors duration-150
                                                                ${isSelected ? "text-accent" : "text-text-faint/30 group-hover:text-text-faint"}`}>
                                                                {isSelected ? "✓" : "›"}
                                                            </span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Readme ── */}
                        <div className="bg-surface border border-border rounded-[14px] overflow-hidden shrink-0">
                            <div className="px-5 py-3 border-b border-border">
                                <span className="text-[9px] font-mono text-text-faint tracking-[0.14em] uppercase">Readme</span>
                            </div>
                            <div className="p-5">
                                {current.readme ? (
                                    <div className="readme-prose">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.readme}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <span className="text-[11px] font-mono text-text-faint italic">No readme available.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ══ RIGHT — sticky sidebar ═══════════════════════════ */}
                    <div className="flex flex-col gap-3 w-full lg:w-[220px] shrink-0 lg:sticky lg:top-4">

                        {/* Action card */}
                        <div className="bg-surface border border-border rounded-[14px] p-4 flex flex-col gap-3">

                            {/* Selected version callout */}
                            <AnimatePresence>
                                {selectedVersion && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[7px] bg-amber-400/5 border border-amber-400/20 mb-1">
                                            <div className="flex flex-col gap-[2px]">
                                                <span className="text-[8px] font-mono text-amber-400/60 tracking-[0.08em] uppercase">Selected</span>
                                                <span className="text-[11px] font-mono text-amber-400/90 font-semibold">v{selectedVersion}</span>
                                            </div>
                                            <button
                                                className="text-[10px] font-mono text-text-faint/50 hover:text-text-faint transition-colors"
                                                onClick={() => setSelectedVersion(null)}
                                                title="Clear selection"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {current.installed ? (
                                <>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-pos shrink-0" />
                                        <span className="text-[10px] font-mono text-pos">
                                            {current.linked ? "Linked locally" : `Installed v${current.installedVersion ?? ""}`}
                                        </span>
                                    </div>

                                    {/* If a different version is selected, offer to install that version */}
                                    {selectedVersion && selectedVersion !== current.installedVersion ? (
                                        <button
                                            className="w-full py-2 rounded-[8px] bg-amber-400/80 text-bg text-[11px] font-mono font-bold tracking-[0.04em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                                            onClick={() => handleInstall(selectedVersion)}
                                            disabled={pending}
                                        >
                                            {pending ? <><Spinner size={10} /> Installing…</> : `↓ Install v${selectedVersion}`}
                                        </button>
                                    ) : null}

                                    <button
                                        className="w-full py-2 rounded-[8px] border border-border text-text-faint text-[11px] font-mono hover:border-neg hover:text-neg transition-colors active:scale-[0.98] disabled:opacity-40"
                                        onClick={handleRemove}
                                        disabled={pending}
                                    >
                                        {pending ? "···" : "Remove"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="w-full py-2 rounded-[8px] bg-accent text-bg text-[11px] font-mono font-bold tracking-[0.04em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                                        onClick={() => handleInstall(selectedVersion ?? undefined)}
                                        disabled={pending}
                                    >
                                        {pending
                                            ? <><Spinner size={10} /> Installing…</>
                                            : selectedVersion && !isLatestSelected
                                                ? `↓ Install v${selectedVersion}`
                                                : "+ Install"
                                        }
                                    </button>
                                    <button
                                        className="w-full py-2 rounded-[8px] border border-border text-text-faint text-[11px] font-mono hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98] disabled:opacity-40"
                                        onClick={() => { setLinkError(null); setLinkPath(""); setLinkOpen(true); }}
                                        disabled={pending}
                                    >
                                        ⇄ Link local
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Stats card */}
                        <div className="bg-surface border border-border rounded-[14px] overflow-hidden">
                            <div className="px-4 py-3 border-b border-border">
                                <span className="text-[9px] font-mono text-text-faint tracking-[0.12em] uppercase">Info</span>
                            </div>
                            <div className="divide-y divide-border">
                                <StatRow label="Package" value={current.package} mono />
                                <StatRow label="Namespace" value={current.namespace} mono />
                                <StatRow label="npm version" value={current.npmVersion ? `v${current.npmVersion}` : "—"} mono />
                                <StatRow label="Installed" value={current.installedVersion ? `v${current.installedVersion}` : "—"} mono />
                                <StatRow label="Selected" value={selectedVersion ? `v${selectedVersion}` : "latest"} mono />
                                <StatRow label="Downloads/wk" value={current.weeklyDownloads != null ? current.weeklyDownloads.toLocaleString() : "—"} />
                                <StatRow
                                    label="Status"
                                    value={!current.installed ? "Not installed" : current.linked ? "Linked" : "Installed"}
                                    accent={current.installed}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Link modal ── */}
            <AnimatePresence>
                {linkOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setLinkOpen(false)}
                    >
                        <motion.div
                            className="bg-surface border border-border rounded-[14px] p-5 w-full max-w-sm flex flex-col gap-4 mx-4"
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">Link local plugin</h2>
                                <p className="text-[11px] font-mono text-text-muted">{current.package}</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono text-text-faint">Local path</label>
                                <input
                                    autoFocus
                                    className="w-full bg-bg border border-border rounded-[7px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
                                    placeholder="C:\projects\my-plugin"
                                    value={linkPath}
                                    onChange={e => { setLinkPath(e.target.value); setLinkError(null); }}
                                    onKeyDown={e => e.key === "Enter" && handleLinkConfirm()}
                                />
                                {linkError && <span className="text-[10px] font-mono text-red-400">{linkError}</span>}
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    className="px-3 py-1.5 rounded-[7px] border border-border text-text-faint text-[10px] font-mono hover:text-text transition-colors"
                                    onClick={() => setLinkOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-3 py-1.5 rounded-[7px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity"
                                    onClick={handleLinkConfirm}
                                >
                                    Link
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toast ── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[8px] border text-[11px] font-mono whitespace-nowrap
                            ${toast.type === "success" ? "bg-surface border-pos/30 text-pos" : "bg-surface border-neg/30 text-neg"}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}