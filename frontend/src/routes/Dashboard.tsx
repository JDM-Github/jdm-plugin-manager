// ─── Dashboard.tsx ────────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardCatalog } from "../hooks/useDashboardCatalog";
import type { DashboardPlugin, RecentPlugin } from "../hooks/useDashboardCatalog";


const container = {
	hidden: {},
	show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
	hidden: { opacity: 0, y: 8 },
	show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
	try {
		const d = new Date(iso);
		const now = Date.now();
		const diff = now - d.getTime();
		const mins = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (mins < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	} catch { return iso; }
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
	return <div className={`animate-pulse rounded-[8px] bg-surface border border-border ${className}`} />;
}

function StatCard({ label, value, sub, accent }: {
	label: string; value: string | number; sub: string; accent?: boolean;
}) {
	return (
		<motion.div
			variants={fadeUp}
			className="bg-surface border border-border hover:border-accent/20 rounded-[10px] px-4 py-4 flex flex-col gap-1.5 transition-colors duration-200"
		>
			<span className="text-[9px] font-mono text-text-faint tracking-[0.14em] uppercase">{label}</span>
			<span className={`text-[26px] font-bold tracking-[-0.5px] font-display leading-none ${accent ? "text-accent glow-accent-text" : "text-text"}`}>
				{value}
			</span>
			<span className="text-[10px] font-mono text-text-muted">{sub}</span>
		</motion.div>
	);
}

function InstalledRow({ plugin }: { plugin: DashboardPlugin }) {
	const hasUpdate = !plugin.linked && plugin.latestVersion && plugin.version !== plugin.latestVersion;
	const abbr = plugin.namespace.slice(0, 2).toUpperCase();

	return (
		<motion.div
			variants={fadeUp}
			className="flex items-center gap-3 px-4 py-3 hover:bg-accent-dim/40 transition-colors duration-150 group"
		>
			{/* Icon */}
			<div className="w-8 h-8 rounded-[7px] bg-accent-dim border border-accent-border flex items-center justify-center shrink-0 glow-accent">
				<span className="font-display text-[8px] font-black text-accent tracking-[0.04em]">{abbr}</span>
			</div>

			{/* Name + commands */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-mono font-semibold text-text truncate group-hover:text-accent transition-colors duration-150">
						{plugin.package}
					</span>
					{plugin.linked && (
						<span className="text-[8px] font-mono px-1.5 py-[2px] rounded-[3px] bg-accent-dim border border-accent-border text-accent/70 tracking-[0.04em] shrink-0">
							LINKED
						</span>
					)}
				</div>
				{plugin.commands.length > 0 && (
					<div className="flex items-center gap-1 mt-1 flex-wrap">
						{plugin.commands.slice(0, 4).map((c: any) => (
							<span key={typeof c === "string" ? c : c.name} className="text-[8px] font-mono text-text-faint bg-bg border border-border px-1.5 py-[1px] rounded-[3px]">
								{typeof c === "string" ? c : c.name}
							</span>
						))}
						{plugin.commands.length > 4 && (
							<span className="text-[8px] font-mono text-text-faint/50">+{plugin.commands.length - 4}</span>
						)}
					</div>
				)}
			</div>

			{/* Version */}
			<div className="text-right shrink-0">
				<div className="text-[10px] font-mono text-text-muted">v{plugin.version}</div>
				{hasUpdate && (
					<div className="text-[9px] font-mono text-amber-400/70 mt-[2px]">→ v{plugin.latestVersion}</div>
				)}
				{!hasUpdate && !plugin.linked && (
					<div className="text-[8px] font-mono text-pos/60 mt-[2px]">up to date</div>
				)}
			</div>
		</motion.div>
	);
}

function RecentRow({ item, index }: { item: RecentPlugin; index: number }) {
	return (
		<motion.div
			variants={fadeUp}
			custom={index}
			className="flex items-start gap-3 px-4 py-3 hover:bg-accent-dim/30 transition-colors duration-150 group"
		>
			<div className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0 mt-[5px]" />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-mono text-text truncate group-hover:text-accent transition-colors duration-150">
						{item.package}
					</span>
					<span className="text-[9px] font-mono text-accent/50">v{item.version}</span>
					{item.is_official && (
						<span className="text-[7px] font-mono px-1 py-[1px] rounded-full bg-accent/10 border border-accent/20 text-accent/70 tracking-wider">
							OFFICIAL
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 mt-[2px]">
					<span className="text-[9px] font-mono text-text-faint/60">by {item.submitted_by}</span>
				</div>
			</div>
			<span className="text-[9px] font-mono text-text-faint/50 shrink-0 mt-[2px]">
				{formatDate(item.created_at)}
			</span>
		</motion.div>
	);
}

// ─────────────────────────────────────────────────────────────
//  Dashboard
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
	const { data, loading, error, reload, updatesAvailable } = useDashboardCatalog();

	const stats = data?.stats;
	const installed = data?.installed ?? [];
	const recent = data?.recent_plugins ?? [];

	return (
		<div className="flex flex-col gap-3">

			{/* ── Heading ── */}
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="font-display text-[16px] font-bold text-accent glow-accent-text tracking-[0.06em]">
						Overview
					</h1>
					<p className="text-[11px] font-mono text-text-muted tracking-[0.04em]">
						JDM Plugin Manager · dashboard
					</p>
				</div>
				<div className="flex items-center gap-3">
					{!loading && (
						<button
							onClick={reload}
							className="text-[9px] font-mono text-text-faint hover:text-accent transition-colors tracking-[0.08em]"
							title="Refresh"
						>
							↺ refresh
						</button>
					)}
					<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-accent-dim border border-accent-border">
						<span className="w-1.5 h-1.5 rounded-full bg-pos" style={{ animation: "jdm-pulse 2s ease-in-out infinite" }} />
						<span className="text-[9px] font-mono text-accent/60 tracking-[0.1em]">READY</span>
					</div>
				</div>
			</div>

			{/* ── Error banner ── */}
			<AnimatePresence>
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						className="flex items-center justify-between gap-4 px-4 py-3 rounded-[8px] bg-surface border border-neg/30 text-neg text-[11px] font-mono"
					>
						<span>⚠ {error}</span>
						<button onClick={reload} className="text-text-muted hover:text-text transition-colors font-mono text-[10px]">
							retry
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ── Stat strip ── */}
			{loading ? (
				<div className="grid grid-cols-5 gap-3">
					{[...Array(5)].map((_, i) => <SkeletonBlock key={i} className="h-[88px]" />)}
				</div>
			) : (
				<motion.div
					className="grid grid-cols-5 gap-3"
					variants={container}
					initial="hidden"
					animate="show"
				>
					<StatCard label="Installed" value={stats?.installed ?? 0} sub="Active plugins" accent />
					<StatCard label="Updates" value={stats?.updates ?? 0} sub="Upgrades available" />
					<StatCard label="Linked" value={stats?.linked ?? 0} sub="Local dev mode" />
					<StatCard label="Catalog" value={stats?.catalog ?? 0} sub="On registry" />
					<StatCard label="Partials" value={stats?.partials ?? 0} sub="Your drafts" />
				</motion.div>
			)}

			{/* ── Updates banner ── */}
			<AnimatePresence>
				{!loading && updatesAvailable.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-[8px] bg-amber-400/5 border border-amber-400/20"
					>
						<div className="flex items-center gap-2">
							<span className="text-amber-400/80 text-[10px]">↑</span>
							<span className="text-[11px] font-mono text-amber-400/80">
								{updatesAvailable.length} plugin{updatesAvailable.length !== 1 ? "s" : ""} can be updated —{" "}
								{updatesAvailable.map(p => p.package).join(", ")}
							</span>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ── Main grid: installed | recent + commands ── */}
			<div className="grid grid-cols-[1fr_280px] gap-3.5">

				{/* Left — Installed plugins */}
				<motion.div
					className="bg-surface border border-border rounded-[10px] overflow-hidden min-h-[350px] max-h-[350px]"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					<div className="flex items-center justify-between px-4 py-[11px] border-b border-border">
						<span className="font-mono text-[12px] font-semibold text-text tracking-[0.03em]">
							Installed Plugins
						</span>
						{!loading && (
							<span className="text-[9px] font-mono text-accent/50 bg-accent-dim border border-accent-border px-2 py-[3px] rounded-[4px] tracking-[0.06em]">
								{installed.length} total
							</span>
						)}
					</div>

					{loading ? (
						<div className="flex flex-col divide-y divide-border">
							{[...Array(4)].map((_, i) => (
								<div key={i} className="flex items-center gap-3 px-4 py-3">
									<SkeletonBlock className="w-8 h-8 shrink-0" />
									<div className="flex-1 flex flex-col gap-1.5">
										<SkeletonBlock className="h-3 w-32" />
										<SkeletonBlock className="h-2.5 w-20" />
									</div>
								</div>
							))}
						</div>
					) : installed.length === 0 ? (
						<div className="flex items-center justify-center py-16">
							<p className="text-[11px] font-mono text-text-faint">No plugins installed yet.</p>
						</div>
					) : (
						<motion.div
							className="divide-y divide-border"
							variants={container}
							initial="hidden"
							animate="show"
						>
							{installed.map(p => (
								<InstalledRow key={p.namespace} plugin={p} />
							))}
						</motion.div>
					)}
				</motion.div>

				{/* Right column */}
				<div className="flex flex-col gap-3.5">

					{/* Recent catalog pushes */}
					<motion.div
						className="bg-surface border border-border rounded-[10px] overflow-hidden min-h-[350px] max-h-[350px]"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.15 }}
					>
						<div className="px-4 py-[11px] border-b border-border">
							<span className="font-mono text-[12px] font-semibold text-text tracking-[0.03em]">
								Recent Pushes
							</span>
						</div>

						{loading ? (
							<div className="flex flex-col divide-y divide-border">
								{[...Array(4)].map((_, i) => (
									<div key={i} className="flex items-center gap-3 px-4 py-3">
										<SkeletonBlock className="w-1.5 h-1.5 rounded-full shrink-0" />
										<div className="flex-1 flex flex-col gap-1.5">
											<SkeletonBlock className="h-2.5 w-28" />
											<SkeletonBlock className="h-2 w-16" />
										</div>
									</div>
								))}
							</div>
						) : recent.length === 0 ? (
							<div className="flex items-center justify-center py-10">
								<p className="text-[10px] font-mono text-text-faint">No recent activity.</p>
							</div>
						) : (
							<motion.div
								className="divide-y divide-border"
								variants={container}
								initial="hidden"
								animate="show"
							>
								{recent.map((item, i) => (
									<RecentRow key={`${item.namespace}-${item.version}`} item={item} index={i} />
								))}
							</motion.div>
						)}
					</motion.div>

					{/* Top commands */}
					{/* <motion.div
						className="bg-surface border border-border rounded-[10px] overflow-hidden"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.2 }}
					>
						<div className="px-4 py-[11px] border-b border-border">
							<span className="font-mono text-[12px] font-semibold text-text tracking-[0.03em]">
								Top Commands
							</span>
						</div>

						<div className="px-4 py-3 flex flex-col gap-2.5">
							{loading ? (
								[...Array(5)].map((_, i) => <SkeletonBlock key={i} className="h-[14px]" />)
							) : topCmds.length === 0 ? (
								<p className="text-[10px] font-mono text-text-faint py-4 text-center">No command data.</p>
							) : (
								topCmds.map(({ command, count }: TopCommand) => (
									<CommandBar key={command} cmd={command} count={count} max={maxCmdCount} />
								))
							)}
						</div>
					</motion.div> */}
				</div>
			</div>
		</div>
	);
}