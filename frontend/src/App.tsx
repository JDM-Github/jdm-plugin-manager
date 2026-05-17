import { useLocation, Routes, Route, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Sidebar from "./layout/Sidebar";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import Dashboard from "./routes/Dashboard";
import Plugins from "./routes/Plugins";
import Available from "./routes/Available";
import RequestHandler from "./lib/utilities/request_handler";
import { APP_NAME } from "./lib/constant";
import { useEffect } from "react";
import PluginRunner from "./routes/PluginRunner";
import AvailablePluginDetail from "./routes/AvailablePluginDetail";
import Login from "./routes/Login";
import { useAuth } from "./lib/context/auth_context";
import Background from "./components/Background";
import Manage from "./routes/Manage";
import { useGlobalRunnerNotifications } from "./hooks/useGlobalRunnerNotifications";

const ROUTE_NAMES: Record<string, string> = {
	"/": "Overview",
	"/plugins": "Installed Plugins",
	"/available": "Available Plugins",
	"/settings": "Settings",
};

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 56;

function ProtectedApp() {
	const location = useLocation();
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	useGlobalRunnerNotifications();
	useEffect(() => {
		const routeName = ROUTE_NAMES[location.pathname] ?? "Page";
		document.title = `${APP_NAME} | ${routeName}`;
	}, [location.pathname]);

	return (
		<div className="flex min-h-screen bg-surface2">

			<Background />

			<Sidebar
				collapsed={sidebarCollapsed}
				onToggle={() => setSidebarCollapsed((v) => !v)}
			/>

			<motion.div
				className="relative z-10 flex flex-col flex-1 min-h-screen"
				animate={{ marginLeft: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
				transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
			>
				<Header />

				<AnimatePresence mode="wait">
					<motion.main
						key={location.pathname}
						className="flex-1 p-8"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
					>
						<Routes location={location}>
							<Route path="/" element={<Dashboard />} />
							<Route path="/plugins" element={<Plugins />} />
							<Route path="/available" element={<Available />} />
							<Route path="/manage" element={<Manage />} />
							<Route path="/plugin-runner/:namespace" element={<PluginRunner />} />
							<Route path="/available/:namespace" element={<AvailablePluginDetail />} />
						</Routes>
					</motion.main>
				</AnimatePresence>

				<Footer />
			</motion.div>
		</div>
	);
}

export default function App() {
	RequestHandler.init();
	const { status } = useAuth();
	if (status === "idle") return null;
	if (status === "unauthenticated" || status === "checking") {
		return (
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		);
	}
	return (
		<Routes>
			<Route path="/login" element={<Navigate to="/" replace />} />
			<Route path="*" element={<ProtectedApp />} />
		</Routes>
	);
}