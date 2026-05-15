import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import SocketHandler from "../utilities/socket_handler";

type SocketContextType = {
    connected: boolean;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string, callback?: (data: any) => void) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        SocketHandler.init();

        SocketHandler.on("connect", () => setConnected(true));
        SocketHandler.on("disconnect", () => setConnected(false));

        setConnected(SocketHandler.isConnected());

        return () => {
            SocketHandler.off("connect");
            SocketHandler.off("disconnect");
        };
    }, []);

    return (
        <SocketContext.Provider value={{
            connected,
            emit: SocketHandler.emit.bind(SocketHandler),
            on: SocketHandler.on.bind(SocketHandler),
            off: SocketHandler.off.bind(SocketHandler),
        }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
    return ctx;
}