import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_CONTAINER } from "../lib/constant";
import { Toast, ToastContainer } from "../components/available/Toast";
import { SearchBar } from "../components/available/SearchBar";
import { AvailableFilterTabs } from "../components/available/AvailableFilterTabs";
import { AvailablePluginCard } from "../components/available/AvailablePluginCard";
import { Spinner } from "../components/available/Spinner";
import { useAvailableCatalog } from "../hooks/useAvailableCatalog";
import { useToast } from "../hooks/useToast";
import { useLinkModal } from "../hooks/useLinkModal";

type AvailableFilter = "all" | "installed" | "not-installed";

const FETCH_MESSAGES = [
    "Fetching plugin catalog…",
    "Resolving registry index…",
    "Almost there…",
];

function SkeletonCard({ delay }: { delay: number }) {
    return (
        <motion.div
            className="h-[180px] rounded-[12px] bg-surface border border-border overflow-hidden relative"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.25 }}
        >
            {/* shimmer sweep */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: delay * 0.5, ease: "easeInOut" }}
            />
            <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-[8px] bg-border/60" />
                    <div className="flex flex-col gap-1.5 flex-1">
                        <div className="h-2.5 w-28 rounded bg-border/60" />
                        <div className="h-2 w-16 rounded bg-border/40" />
                    </div>
                </div>
                <div className="h-2 w-full rounded bg-border/40" />
                <div className="h-2 w-3/4 rounded bg-border/30" />
                <div className="flex gap-2 mt-auto">
                    <div className="h-2 w-12 rounded bg-border/30" />
                    <div className="h-2 w-10 rounded bg-border/30" />
                </div>
            </div>
        </motion.div>
    );
}

function CatalogLoader() {
    const [msgIdx, setMsgIdx] = useState(0);

    useState(() => {
        const iv = setInterval(() => setMsgIdx(i => (i + 1) % FETCH_MESSAGES.length), 1400);
        return () => clearInterval(iv);
    });

    return (
        <div className="flex flex-col gap-4">
            <motion.div
                className="flex items-center gap-2 text-[11px] font-mono text-text-faint"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
                <Spinner size={12} />
                <AnimatePresence mode="wait">
                    <motion.span
                        key={msgIdx}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.18 }}
                    >
                        {FETCH_MESSAGES[msgIdx]}
                    </motion.span>
                </AnimatePresence>
            </motion.div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <SkeletonCard key={i} delay={i * 0.06} />
                ))}
            </div>
        </div>
    );
}

export default function Available() {
    const catalog = useAvailableCatalog();
    const { toast, showToast, dismissToast } = useToast();
    const linkModal = useLinkModal();

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<AvailableFilter>("all");

    const handleInstall = async (pkg: string) => {
        try {
            await catalog.install(pkg);
            showToast(`${pkg} installed`, "success");
        } catch (err: any) {
            showToast(err.message ?? `Failed to install ${pkg}`, "neg");
        }
    };

    const handleRemove = async (namespace: string) => {
        const pkg = catalog.plugins.find(p => p.namespace === namespace)?.package ?? namespace;
        try {
            await catalog.remove(namespace);
            showToast(`${pkg} removed`, "success");
        } catch (err: any) {
            showToast(err.message ?? `Failed to remove ${pkg}`, "neg");
        }
    };

    const handleLinkOpen = (pkg: string) => {
        const target = catalog.plugins.find(p => p.package === pkg);
        if (!target) return;
        linkModal.openLinkModal(target.namespace, pkg);
    };

    const handleLinkConfirm = async () => {
        if (!linkModal.linkModal) return;
        if (!linkModal.linkPath.trim()) {
            linkModal.setLinkError("Local path is required");
            return;
        }
        const { pkg, namespace } = linkModal.linkModal;
        const path = linkModal.linkPath.trim();
        linkModal.closeLinkModal();
        try {
            if (!pkg && !namespace) {
                await catalog.linkAnonymous(path);
                showToast("Package linked", "success");
            } else {
                await catalog.link(pkg, path);
                showToast(`${pkg} linked`, "success");
            }
        } catch (err: any) {
            showToast(err.message ?? "Failed to link package", "neg");
        }
    };

    const installedCount = catalog.plugins.filter(p => p.installed).length;
    const officialCount = catalog.plugins.filter(p => p.official).length;

    const filtered = catalog.plugins.filter(p => {
        const q = search.toLowerCase();
        const matchSearch =
            p.package.toLowerCase().includes(q) ||
            p.namespace.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.commands.some(c => c.toLowerCase().includes(q));
        const matchFilter =
            filter === "all" ? true :
                filter === "installed" ? p.installed :
                    !p.installed;
        return matchSearch && matchFilter;
    });

    return (
        <>
            <div className="flex flex-col gap-3">
                {/* Heading */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-display text-[16px] font-bold text-accent glow-accent-text tracking-[0.06em]">
                            Available Plugins
                        </h1>
                        <motion.p
                            key={catalog.loading ? "loading" : "loaded"}
                            initial={{ opacity: 0, y: 2 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[12px] font-mono text-text-muted"
                        >
                            {catalog.loading
                                ? "Loading catalog…"
                                : `${catalog.plugins.length} plugin${catalog.plugins.length !== 1 ? "s" : ""} on registry · ${installedCount} installed`
                            }
                        </motion.p>
                        {!catalog.loading && catalog.cacheAge && (
                            <p className="text-[10px] font-mono text-text-faint">cached {catalog.cacheAge}</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            disabled={catalog.loading || catalog.reloading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border text-text-faint text-[10px] font-mono hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40 shrink-0 mt-0.5"
                            onClick={() => linkModal.openLinkModal("", "")}
                        >
                            <span className="text-[11px] leading-none">⊕</span>
                            Link Package
                        </button>
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border text-text-faint text-[10px] font-mono hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40 shrink-0 mt-0.5"
                            onClick={() => catalog.loadPlugins(true)}
                            disabled={catalog.loading || catalog.reloading}
                        >
                            <motion.span
                                animate={catalog.reloading ? { rotate: 360 } : { rotate: 0 }}
                                transition={{ duration: 0.7, repeat: catalog.reloading ? Infinity : 0, ease: "linear" }}
                                className="text-[11px] leading-none inline-block"
                            >
                                ↻
                            </motion.span>
                            {catalog.reloading ? "Refreshing…" : "Refresh"}
                        </button>
                    </div>
                </div>

                {/* Official badge legend */}
                <AnimatePresence>
                    {!catalog.loading && officialCount > 0 && (
                        <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                        >
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-[9px] font-mono font-bold tracking-wider uppercase">
                                <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                    <path d="M8 0l1.8 5.4H16l-4.7 3.4 1.8 5.5L8 11l-5.1 3.3 1.8-5.5L0 5.4h6.2z" />
                                </svg>
                                Official
                            </span>
                            <span className="text-[10px] font-mono text-text-faint">= maintained by the core team</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error banner */}
                <AnimatePresence>
                    {catalog.error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-[8px] bg-surface border border-neg/30 text-neg text-[11px] font-mono overflow-hidden"
                        >
                            <span>⚠ {catalog.error}</span>
                            <button
                                className="text-text-muted hover:text-text transition-colors"
                                onClick={catalog.dismissError}
                            >
                                ✕
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search + filters */}
                <AnimatePresence>
                    {!catalog.loading && (
                        <motion.div
                            className="flex items-center gap-3 flex-wrap"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SearchBar value={search} onChange={setSearch} />
                            <AvailableFilterTabs filter={filter} onChange={setFilter} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Catalog */}
                <div className="relative">
                    {catalog.loading ? (
                        <CatalogLoader />
                    ) : filtered.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center py-20 bg-surface border border-border rounded-[10px]"
                        >
                            <p className="text-[12px] font-mono text-text-faint">
                                {catalog.plugins.length === 0
                                    ? "No plugins in catalog."
                                    : "No plugins match your search."}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2"
                            variants={MOTION_CONTAINER}
                            initial="hidden"
                            animate="show"
                            key={filter + search}
                        >
                            {filtered.map(plugin => (
                                <AvailablePluginCard
                                    key={plugin.namespace}
                                    plugin={plugin}
                                    pending={catalog.pending.has(plugin.namespace)}
                                    pendingAction={catalog.pendingAction.get(plugin.namespace) ?? null}
                                    onInstall={handleInstall}
                                    onRemove={handleRemove}
                                    onLink={handleLinkOpen}
                                />
                            ))}
                        </motion.div>
                    )}

                </div>
            </div>

            {/* Toasts — bottom-right stack, no overlay */}
            <ToastContainer>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onDismiss={dismissToast}
                    />
                )}
            </ToastContainer>

            {/* Link modal */}
            <AnimatePresence>
                {linkModal.linkModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={linkModal.closeLinkModal}
                    >
                        <motion.div
                            className="bg-surface border border-border rounded-[14px] p-5 w-full max-w-md flex flex-col gap-4 mx-4"
                            initial={{ scale: 0.96, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[13px] font-bold font-display text-accent tracking-[0.04em]">
                                    Link local plugin
                                </h2>
                                {linkModal.linkModal.pkg && (
                                    <p className="text-[11px] font-mono text-text-muted">
                                        {linkModal.linkModal.pkg}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono text-text-faint">
                                    Local path
                                </label>
                                <input
                                    autoFocus
                                    className="w-full bg-bg border border-border rounded-[6px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
                                    placeholder="C:\projects\my-plugin"
                                    value={linkModal.linkPath}
                                    onChange={e => linkModal.updateLinkPath(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleLinkConfirm()}
                                />
                                <AnimatePresence>
                                    {linkModal.linkError && (
                                        <motion.span
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-[10px] font-mono text-neg overflow-hidden"
                                        >
                                            {linkModal.linkError}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button
                                    className="px-3 py-1.5 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:text-text hover:border-border/80 transition-all"
                                    onClick={linkModal.closeLinkModal}
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    className="px-3 py-1.5 rounded-[6px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-opacity"
                                    onClick={handleLinkConfirm}
                                >
                                    Link
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}