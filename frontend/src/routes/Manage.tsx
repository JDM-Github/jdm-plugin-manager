// ─── Manage.tsx ──────────────────────────────────────────────
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_CONTAINER } from "../lib/constant";
import { Toast, ToastContainer } from "../components/available/Toast";
import { SearchBar } from "../components/available/SearchBar";
import { PartialCard } from "../components/manage/PartialCard";
import { ManagedPluginCard } from "../components/manage/ManagedPluginCard";
import { useToast } from "../hooks/useToast";
import { useManagePartials } from "../hooks/useManagePartials";
import { useManagePlugins } from "../hooks/useManagePlugins";
import type { PluginPartial, ManagedPlugin, PartialFormModal } from "../lib/types";
import { useAuth } from "../lib/context/auth_context";
import DeleteConfirmModal from "../components/manage/DeleteConfirmModal";
import EmptyState from "../components/manage/EmptyState";
import SkeletonCard from "../components/manage/SkeletonCard";
import AnonymousGate from "../components/manage/AnonymousGate";
import Spinner from "../components/Spinner";
import PushConfirmModal from "../components/manage/PushConfirmModal";
import LinkModal from "../components/manage/LinkModal";
import PartialFormModalComponent from "../components/manage/PartialFormModal";
import { clearCache } from "../hooks/usePluginCache";


export default function Manage() {
    const { user, status } = useAuth();
    const partials = useManagePartials();
    const plugins = useManagePlugins();
    const { toast, showToast, dismissToast } = useToast();

    const [partialSearch, setPartialSearch] = useState("");
    const [pluginSearch, setPluginSearch] = useState("");

    const [formModal, setFormModal] = useState<PartialFormModal | null>(null);
    const [linkModal, setLinkModal] = useState<{ namespace: string; pkg: string } | null>(null);
    const [pushModal, setPushModal] = useState<PluginPartial | null>(null);
    const [deleteModal, setDeleteModal] = useState<
        | { kind: "partial"; item: PluginPartial }
        | { kind: "plugin"; item: ManagedPlugin }
        | null
    >(null);
    const [pushing, setPushing] = useState(false);

    useEffect(() => {
        if (user?.type === "npm") {
            partials.load();
            plugins.load();
        }
    }, [user]);

    if (status === "idle" || status === "checking") {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex items-center gap-2 text-[11px] font-mono text-text-faint">
                    <Spinner size={12} />
                    <span>Checking session…</span>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated" || user?.type === "anonymous") {
        return <AnonymousGate />;
    }

    const handleFormConfirm = async (namespace: string, pkg: string, version: string) => {
        try {
            if (formModal?.mode === "new") {
                await partials.create(namespace, pkg, version);
                showToast(`${pkg} partial created`, "success");
            } else if (formModal?.mode === "edit" && formModal.partial.namespace) {
                await partials.update(formModal.partial.namespace, { namespace, package: pkg, version });
                showToast(`${pkg} partial updated`, "success");
            }
            setFormModal(null);
        } catch (err: any) {
            showToast(err.message ?? "Operation failed", "neg");
        }
    };

    const handleLinkConfirm = async (result: { linkPath: string }) => {
        if (!linkModal) return;
        try {
            setLinkModal(null);
            await partials.link(linkModal.namespace, result.linkPath);
            showToast(`${linkModal.pkg} linked`, "success");
        } catch (err: any) {
            showToast(err.message ?? "Link failed", "neg");
        }
    };

    const handleInstall = async (namespace: string, linkPath: string) => {
        const p = partials.partials.find(x => x.namespace === namespace);
        try {
            await partials.installed(namespace, linkPath);
            showToast(`${p?.package ?? namespace} installed successfully`, "success");
            await clearCache();
        } catch (err: any) {
            showToast(err.message ?? "Installation failed", "neg");
        }
    };

    const handleUnlink = async (namespace: string) => {
        const p = partials.partials.find(x => x.namespace === namespace);
        try {
            await partials.unlink(namespace);
            showToast(`${p?.package ?? namespace} unlinked`, "success");
        } catch (err: any) {
            showToast(err.message ?? "Unlink failed", "neg");
        }
    };

    const handlePushConfirm = async () => {
        if (!pushModal) return;
        setPushing(true);
        try {
            await partials.push(pushModal.namespace);
            showToast(`${pushModal.package} v${pushModal.version} submitted for review`, "success");
            await plugins.reload();
            setPushModal(null);
            await clearCache();
        } catch (err: any) {
            showToast(err.message ?? "Push failed", "neg");
        } finally {
            setPushing(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal) return;
        const { kind, item } = deleteModal;
        setDeleteModal(null);
        try {
            if (kind === "partial") {
                await partials.remove(item.namespace);
                showToast(`${item.package} partial deleted`, "success");
            } else {
                await plugins.remove(item.namespace);
                showToast(`${item.package} plugin deleted`, "success");
                await clearCache();
            }
        } catch (err: any) {
            showToast(err.message ?? "Delete failed", "neg");
        }
    };

    const filteredPartials = partials.partials.filter(p => {
        const q = partialSearch.toLowerCase();
        return (
            p.package.toLowerCase().includes(q) ||
            p.namespace.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    });

    const filteredPlugins = plugins.plugins.filter(p => {
        const q = pluginSearch.toLowerCase();
        return (
            p.package.toLowerCase().includes(q) ||
            p.namespace.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    });

    // ── Counts ────────────────────────────────────────────────

    const linkedCount = partials.partials.filter(p => !!p.link_path).length;
    const pendingCount = plugins.plugins.filter(p => p.approved === null).length;
    const approvedCount = plugins.plugins.filter(p => p.approved === true).length;

    return (
        <>
            {/* Two-panel layout — splits at lg breakpoint, stacks below */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border/40 min-h-0">

                {/* ════════════════════════════════════════════
                    PANEL 1 — MY PARTIALS
                ════════════════════════════════════════════ */}
                <section className="flex flex-col gap-3 pb-10 lg:pb-0 lg:pr-8">

                    {/* Panel header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <h1 className="font-display text-[16px] font-bold text-accent glow-accent-text tracking-[0.06em]">
                                My Partials
                            </h1>
                            <motion.p
                                key={partials.partials.length}
                                initial={{ opacity: 0, y: 2 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[12px] font-mono text-text-muted"
                            >
                                {partials.loading
                                    ? "Loading…"
                                    : partials.partials.length === 0
                                        ? "No partials yet"
                                        : `${partials.partials.length} partial${partials.partials.length !== 1 ? "s" : ""} · ${linkedCount} linked`
                                }
                            </motion.p>
                            <p className="text-[10px] font-mono text-text-faint/50">
                                as <span className="text-accent/60">{user?.username}</span>
                            </p>
                        </div>

                        <div className="flex gap-1.5">
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border text-text-faint text-[10px] font-mono hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40 shrink-0 mt-0.5"
                                onClick={() => partials.load()}
                                disabled={partials.loading}
                            >
                                <motion.span
                                    animate={partials.loading ? { rotate: 360 } : { rotate: 0 }}
                                    transition={{ duration: 0.7, repeat: partials.loading ? Infinity : 0, ease: "linear" }}
                                    className="text-[11px] leading-none inline-block"
                                >
                                    ↻
                                </motion.span>
                                {partials.loading ? "Refreshing…" : "Refresh"}
                            </button>

                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-accent text-bg text-[10px] font-mono font-bold hover:opacity-85 transition-all shrink-0 mt-0.5 disabled:opacity-40"
                                onClick={() => setFormModal({ mode: "new", partial: {} })}
                                disabled={partials.loading}
                            >
                                <span className="text-[12px] leading-none">+</span>
                                New Partial
                            </button>
                        </div>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                        {partials.error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                className="flex items-center justify-between gap-4 px-4 py-3 rounded-[8px] bg-surface border border-neg/30 text-neg text-[11px] font-mono overflow-hidden"
                            >
                                <span>⚠ {partials.error}</span>
                                <button className="text-text-muted hover:text-text transition-colors" onClick={partials.dismissError}>✕</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* First-time info banner */}
                    {!partials.loading && partials.partials.length === 0 && !partials.error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2.5 px-3.5 py-3 rounded-[8px] bg-surface border border-border"
                        >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-accent/60 shrink-0 mt-[1px]" aria-hidden>
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <p className="text-[10px] font-mono text-text-faint leading-relaxed">
                                Create a partial with a <span className="text-text-muted">namespace</span>,{" "}
                                <span className="text-text-muted">package name</span>, and{" "}
                                <span className="text-text-muted">version</span>, then{" "}
                                <span className="text-accent/70">link</span> a local path to load its description
                                and commands from <span className="text-accent/50">package.json</span>.
                                Once linked, use <span className="text-accent/70">Push</span> to submit a new version for review.
                            </p>
                        </motion.div>
                    )}

                    {/* Search */}
                    <AnimatePresence>
                        {!partials.loading && partials.partials.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SearchBar value={partialSearch} onChange={setPartialSearch} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cards — single column inside each panel */}
                    <div className="relative">
                        {partials.loading ? (
                            <div className="flex flex-col gap-3">
                                {[...Array(3)].map((_, i) => <SkeletonCard key={i} delay={i * 0.06} />)}
                            </div>
                        ) : filteredPartials.length === 0 ? (
                            <EmptyState
                                hasSearch={partialSearch.length > 0}
                                onNew={() => setFormModal({ mode: "new", partial: {} })}
                            />
                        ) : (
                            <motion.div
                                className="flex flex-col gap-3"
                                variants={MOTION_CONTAINER}
                                initial="hidden"
                                animate="show"
                                key={partialSearch}
                            >
                                {filteredPartials.map(partial => (
                                    <PartialCard
                                        key={partial.namespace}
                                        partial={partial}
                                        pending={partials.pending.has(partial.namespace)}
                                        pendingAction={partials.pending.get(partial.namespace) ?? null}
                                        onEdit={p => setFormModal({ mode: "edit", partial: p })}
                                        onLink={ns => {
                                            const p = partials.partials.find(x => x.namespace === ns);
                                            if (p) setLinkModal({ namespace: ns, pkg: p.package });
                                        }}
                                        onUnlink={handleUnlink}
                                        onPush={ns => {
                                            const p = partials.partials.find(x => x.namespace === ns);
                                            if (p) setPushModal(p);
                                        }}
                                        onDelete={ns => {
                                            const p = partials.partials.find(x => x.namespace === ns);
                                            if (p) setDeleteModal({ kind: "partial", item: p });
                                        }}
                                        onInstall={handleInstall}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* ════════════════════════════════════════════
                    PANEL 2 — MY PLUGINS (published)
                ════════════════════════════════════════════ */}
                <section className="flex flex-col gap-3 pt-10 lg:pt-0 lg:pl-8">

                    {/* Panel header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <h2 className="font-display text-[16px] font-bold text-accent glow-accent-text tracking-[0.06em]">
                                My Plugins
                            </h2>
                            <motion.p
                                key={plugins.plugins.length}
                                initial={{ opacity: 0, y: 2 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[12px] font-mono text-text-muted"
                            >
                                {plugins.loading
                                    ? "Loading…"
                                    : plugins.plugins.length === 0
                                        ? "No plugins pushed yet"
                                        : `${plugins.plugins.length} plugin${plugins.plugins.length !== 1 ? "s" : ""} · ${approvedCount} approved · ${pendingCount} pending`
                                }
                            </motion.p>
                            <p className="text-[10px] font-mono text-text-faint/50">
                                Push a linked partial to create a plugin version
                            </p>
                        </div>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                        {plugins.error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                className="flex items-center justify-between gap-4 px-4 py-3 rounded-[8px] bg-surface border border-neg/30 text-neg text-[11px] font-mono overflow-hidden"
                            >
                                <span>⚠ {plugins.error}</span>
                                <button className="text-text-muted hover:text-text transition-colors" onClick={plugins.dismissError}>✕</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Search */}
                    <AnimatePresence>
                        {!plugins.loading && plugins.plugins.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SearchBar value={pluginSearch} onChange={setPluginSearch} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cards — single column inside each panel */}
                    <div className="relative">
                        {plugins.loading ? (
                            <div className="flex flex-col gap-3">
                                {[...Array(2)].map((_, i) => <SkeletonCard key={i} delay={i * 0.06} />)}
                            </div>
                        ) : filteredPlugins.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center gap-3 py-14 bg-surface border border-border rounded-[10px]"
                            >
                                <p className="text-[12px] font-mono text-text-faint">
                                    {pluginSearch.length > 0
                                        ? "No plugins match your search."
                                        : "No plugins yet — push a linked partial to get started."
                                    }
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="flex flex-col gap-3"
                                variants={MOTION_CONTAINER}
                                initial="hidden"
                                animate="show"
                                key={pluginSearch}
                            >
                                {filteredPlugins.map(plugin => (
                                    <ManagedPluginCard
                                        key={plugin.namespace}
                                        plugin={plugin}
                                        pendingDelete={plugins.pendingDelete.has(plugin.namespace)}
                                        onDelete={(ns: any) => {
                                            const p = plugins.plugins.find(x => x.namespace === ns);
                                            if (p) setDeleteModal({ kind: "plugin", item: p });
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </div>
                </section>
            </div>

            {/* ── Toasts ── */}
            <ToastContainer>
                {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
            </ToastContainer>

            {/* ── Modals ── */}
            <AnimatePresence>
                {formModal && (
                    <PartialFormModalComponent
                        key="form"
                        modal={formModal}
                        onClose={() => setFormModal(null)}
                        onConfirm={handleFormConfirm}
                    />
                )}
                {linkModal && (
                    <LinkModal
                        key="link"
                        modal={linkModal}
                        onClose={() => setLinkModal(null)}
                        onConfirm={handleLinkConfirm}
                    />
                )}
                {pushModal && (
                    <PushConfirmModal
                        key="push"
                        partial={pushModal}
                        onClose={() => setPushModal(null)}
                        onConfirm={handlePushConfirm}
                        pushing={pushing}
                    />
                )}
                {deleteModal && (
                    <DeleteConfirmModal
                        key="delete"
                        target={deleteModal}
                        onClose={() => setDeleteModal(null)}
                        onConfirm={handleDeleteConfirm}
                    />
                )}
            </AnimatePresence>
        </>
    );
}