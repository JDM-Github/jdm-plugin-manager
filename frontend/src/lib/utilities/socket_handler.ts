import { io, Socket } from "socket.io-client";
import RequestHandler from "./request_handler";

type SocketEventCallback = (data: any) => void;

export default class SocketHandler {
    private static socket: Socket | null = null;
    private static connected: boolean = false;

    static init() {
        if (SocketHandler.socket) return;

        SocketHandler.socket = io(RequestHandler.baseURL, {
            transports: ["websocket"],
            autoConnect: true,
        });

        SocketHandler.socket.on("connect", () => {
            SocketHandler.connected = true;
            console.log("[Socket] Connected:", SocketHandler.socket?.id);
        });

        SocketHandler.socket.on("disconnect", () => {
            SocketHandler.connected = false;
            console.log("[Socket] Disconnected");
        });

        SocketHandler.socket.on("connect_error", (err) => {
            SocketHandler.connected = false;
            console.error("[Socket] Connection error:", err.message);
        });
    }

    static isConnected(): boolean {
        return SocketHandler.connected;
    }

    static emit(event: string, data: any = {}) {
        if (!SocketHandler.socket) {
            console.warn("[Socket] Not initialized. Call SocketHandler.init() first.");
            return;
        }
        SocketHandler.socket.emit(event, data);
    }

    static on(event: string, callback: SocketEventCallback) {
        if (!SocketHandler.socket) {
            console.warn("[Socket] Not initialized. Call SocketHandler.init() first.");
            return;
        }
        SocketHandler.socket.on(event, callback);
    }

    static off(event: string, callback?: SocketEventCallback) {
        if (!SocketHandler.socket) return;
        SocketHandler.socket.off(event, callback);
    }

    static disconnect() {
        SocketHandler.socket?.disconnect();
        SocketHandler.socket = null;
        SocketHandler.connected = false;
    }
}