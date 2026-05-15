// ─── Sidebar.tsx ──────────────────────────────────────────────
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "../lib/context/auth_context";

type NavItem = {
	label: string;
	path: string;
	icon: React.ReactNode;
	badge?: string;
};

type NavSection = {
	section: string;
	items: NavItem[];
};

function buildNav(): NavSection[] {
	return [
		{
			section: "General",
			items: [
				{
					label: "Overview",
					path: "/",
					icon: (
						<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
							<rect x="1" y="1" width="5.5" height="5.5" rx="1.2" />
							<rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" />
							<rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" />
							<rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" />
						</svg>
					),
				},
			],
		},
		{
			section: "Plugins",
			items: [
				{
					label: "Installed",
					path: "/plugins",
					icon: (
						<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
							<rect x="2" y="2" width="11" height="11" rx="2" />
							<path d="M5 7.5h5M7.5 5v5" strokeLinecap="round" />
						</svg>
					),
				},
				{
					label: "Available",
					path: "/available",
					icon: (
						<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
							<circle cx="7.5" cy="7.5" r="5.5" />
							<path d="M7.5 4.5v3l2 1.5" strokeLinecap="round" />
						</svg>
					),
				},
				{
					label: "Manage",
					path: "/manage",
					icon: (
						<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
							<path d="M2 4h11M2 7.5h11M2 11h11" strokeLinecap="round" />
							<circle cx="5" cy="4" r="1.2" fill="currentColor" stroke="none" />
							<circle cx="10" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
							<circle cx="5" cy="11" r="1.2" fill="currentColor" stroke="none" />
						</svg>
					),
				},
			],
		},
	];
}

// ─── Tooltip ────────────────────────────────────────────────────
function Tooltip({ label, children, enabled }: { label: string; children: React.ReactNode; enabled: boolean }) {
	const [visible, setVisible] = useState(false);
	if (!enabled) return <>{children}</>;
	return (
		<div
			className="relative flex items-center w-full"
			onMouseEnter={() => setVisible(true)}
			onMouseLeave={() => setVisible(false)}
		>
			{children}
			<AnimatePresence>
				{visible && (
					<motion.div
						className="absolute left-full ml-3 z-[200] pointer-events-none"
						initial={{ opacity: 0, x: -6 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -4 }}
						transition={{ duration: 0.12, ease: "easeOut" }}
					>
						<div className="flex items-center">
							<div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[5px] border-r-border" />
							<span className="font-mono text-[11px] tracking-[0.05em] text-text bg-surface border border-border px-2.5 py-1 rounded-[6px] shadow-lg whitespace-nowrap">
								{label}
							</span>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// ─── Collapse icon ──────────────────────────────────────────────
function CollapseIcon({ collapsed }: { collapsed: boolean }) {
	return (
		<motion.svg
			width="14" height="14" viewBox="0 0 14 14"
			fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
			animate={{ rotate: collapsed ? 0 : 180 }}
			transition={{ duration: 0.25, ease: "easeInOut" }}
		>
			<path d="M5 2L9 7L5 12" />
		</motion.svg>
	);
}

const ADMIN_USERNAME = "jdmaster";
function deriveUserDisplay(user: ReturnType<typeof useAuth>["user"]) {
	if (!user) return { initials: "?", name: "Unknown", role: "guest", roleColor: "text-text-faint/50" };

	if (user.type === "anonymous") {
		return {
			initials: "AN",
			name: user.username === "anonymous" ? "Anonymous" : user.username,
			role: "anonymous",
			roleColor: "text-text-faint/50",
		};
	}
	const isAdmin = user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
	const initials = user.username.slice(0, 2).toUpperCase();

	return {
		initials,
		name: user.username,
		role: isAdmin ? "admin" : "npm user",
		roleColor: isAdmin ? "text-accent/60" : "text-pos/50",
	};
}

type SidebarProps = {
	collapsed: boolean;
	onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
	const location = useLocation();
	const { user, logout } = useAuth();
	const nav = buildNav();

	const { initials, name, role, roleColor } = deriveUserDisplay(user);
	const tooltipLabel = `${name} · ${role}`;

	return (
		<motion.aside
			className="fixed top-0 left-0 h-screen flex flex-col z-50 overflow-hidden border-r border-border"
			animate={{ width: collapsed ? 56 : 220 }}
			transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
			style={{
				background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface) 100%)",
			}}
		>
			{/* Top glow */}
			<div className="absolute top-0 left-0 right-0 h-48 pointer-events-none" style={{
				background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-accent) 10%, transparent) 0%, transparent 70%)",
			}} />
			{/* Bottom glow */}
			<div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{
				background: "radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 70%)",
			}} />

			{/* ── Logo ── */}
			<div className="relative h-[72px] flex items-center border-b border-border shrink-0 overflow-hidden">
				<AnimatePresence mode="wait">
					{collapsed ? (
						<motion.div
							key="icon"
							className="flex items-center justify-center w-full"
							initial={{ opacity: 0, scale: 0.85 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.85 }}
							transition={{ duration: 0.16 }}
						>
							<img src="/icon.png" alt="Icon" className="h-16 w-16 object-contain" />
						</motion.div>
					) : (
						<motion.div
							key="title"
							className="flex items-center px-4 w-full"
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -8 }}
							transition={{ duration: 0.16 }}
						>
							<img src="/title.png" alt="Title" className="h-36 object-contain object-center min-w-0 flex-1" />
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* ── Nav ── */}
			<nav className="relative flex-1 px-2 py-3 flex flex-col overflow-y-auto overflow-x-hidden">
				{nav.map(({ section, items }, sIdx) => (
					<div key={section}>
						{/* Section header */}
						<div className={["flex items-center gap-2 px-1 h-[22px]", sIdx === 0 ? "mt-0" : "mt-2"].join(" ")}>
							<div className="w-[3px] h-[3px] rounded-full bg-border/70 shrink-0" />
							<motion.span
								className="font-mono text-[9px] text-text-faint tracking-[0.18em] uppercase whitespace-nowrap overflow-hidden"
								animate={{ opacity: collapsed ? 0 : 1 }}
								transition={{ duration: 0.15 }}
							>
								{section}
							</motion.span>
						</div>

						{/* Items */}
						{items.map((item) => {
							const isActive =
								item.path === "/"
									? location.pathname === "/"
									: location.pathname.startsWith(item.path);

							return (
								<Tooltip key={item.path} label={item.label} enabled={collapsed}>
									<NavLink
										to={item.path}
										className={[
											"relative flex items-center rounded-[7px] font-medium transition-colors duration-150 overflow-hidden border mb-0.5",
											collapsed ? "justify-center px-0 py-[9px] w-full" : "gap-[9px] px-2.5 py-[7px]",
											isActive
												? "bg-accent-dim text-accent border-accent-border"
												: "text-text-muted hover:bg-surface3 hover:text-text border-transparent",
										].join(" ")}
									>
										<span className={["flex items-center justify-center shrink-0 transition-opacity", isActive ? "opacity-100" : "opacity-50"].join(" ")}>
											{item.icon}
										</span>

										<motion.span
											className="font-mono text-[11px] tracking-[0.04em] whitespace-nowrap overflow-hidden"
											animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
											transition={{ duration: 0.22 }}
										>
											{item.label}
										</motion.span>

										{!collapsed && item.badge && (
											<span className="text-[9px] font-mono font-bold bg-neu/15 text-neu border border-neu/25 px-1.5 py-[2px] rounded-[4px] tracking-[0.04em]">
												{item.badge}
											</span>
										)}

										{isActive && (
											<motion.span
												className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-[55%] bg-accent rounded-l-[2px] glow-accent"
												layoutId="active-bar"
												transition={{ duration: 0.2, ease: "easeOut" }}
											/>
										)}
									</NavLink>
								</Tooltip>
							);
						})}
					</div>
				))}
			</nav>

			{/* ── Bottom ── */}
			<div className="relative border-t border-border shrink-0">

				{/* User row */}
				<Tooltip label={tooltipLabel} enabled={collapsed}>
					<div className="flex items-center gap-2.5 py-2.5 w-full px-3.5">
						<div className="w-[28px] h-[28px] rounded-full bg-accent-dim border border-accent-border flex items-center justify-center shrink-0">
							<span className="font-mono text-[8px] font-bold text-accent tracking-[0.04em]">
								{initials}
							</span>
						</div>
						<motion.div
							className="flex-1 min-w-0 overflow-hidden"
							animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
							transition={{ duration: 0.22 }}
						>
							<div className="text-[12px] font-mono font-semibold text-text truncate tracking-[0.02em]">
								{name}
							</div>
							<div className={`text-[9px] font-mono tracking-[0.12em] uppercase ${roleColor}`}>
								{role}
							</div>
						</motion.div>
					</div>
				</Tooltip>

				{/* Thin rule */}
				<div className="mx-3 border-t border-border/40" />

				{/* Logout + Collapse row */}
				<div className={["flex items-center py-1.5 gap-1", collapsed ? "flex-col px-1.5" : "px-2"].join(" ")}>

					{/* Logout */}
					<Tooltip label="Logout" enabled={collapsed}>
						<motion.button
							whileTap={{ scale: 0.96 }}
							onClick={logout}
							aria-label="Logout"
							className={[
								"flex items-center gap-1.5 rounded-[6px] text-text-faint hover:text-neg hover:bg-neg/5 border border-transparent hover:border-neg/15 transition-all duration-150 group",
								collapsed ? "justify-center w-full p-2" : "px-2.5 py-1.5 flex-1",
							].join(" ")}
						>
							<svg
								width="13" height="13" viewBox="0 0 15 15"
								fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
								className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
							>
								<path d="M5.5 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5" />
								<path d="M10 10l3-2.5L10 5" />
								<path d="M13 7.5H6" />
							</svg>
							<motion.span
								className="font-mono text-[10px] tracking-[0.06em] whitespace-nowrap overflow-hidden"
								animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
								transition={{ duration: 0.22 }}
							>
								Logout
							</motion.span>
						</motion.button>
					</Tooltip>

					{/* Divider — only when expanded */}
					{!collapsed && <div className="w-px h-4 bg-border/50 shrink-0" />}

					{/* Collapse toggle */}
					<Tooltip label="Expand sidebar" enabled={collapsed}>
						<button
							onClick={onToggle}
							aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
							className={[
								"flex items-center rounded-[6px] text-text-faint hover:text-text-muted border border-transparent transition-colors duration-150 group",
								collapsed ? "justify-center w-full p-2" : "justify-between px-2.5 py-1.5 gap-2",
							].join(" ")}
						>
							<motion.span
								className="font-mono text-[10px] tracking-[0.1em] uppercase whitespace-nowrap overflow-hidden"
								animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
								transition={{ duration: 0.22 }}
							>
								Collapse
							</motion.span>
							<span className="opacity-50 group-hover:opacity-80 transition-opacity shrink-0">
								<CollapseIcon collapsed={collapsed} />
							</span>
						</button>
					</Tooltip>
				</div>
			</div>
		</motion.aside>
	);
}