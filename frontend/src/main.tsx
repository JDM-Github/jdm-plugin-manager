import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SocketProvider } from "./lib/context/socket_context";
import { AuthProvider } from "./lib/context/auth_context";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<SocketProvider>
				<AuthProvider>
					<App />
				</AuthProvider>
			</SocketProvider>
		</BrowserRouter>
	</StrictMode>
);