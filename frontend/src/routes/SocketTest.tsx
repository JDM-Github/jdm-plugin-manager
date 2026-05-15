import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSocket } from "../lib/context/socket_context";

type Message = {
    id: number;
    direction: "sent" | "received";
    event: string;
    data: any;
    time: string;
};

export default function SocketTest() {
    const { connected, emit, on, off } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [event, setEvent] = useState("ping_server");
    const [payload, setPayload] = useState('{"message": "hello!"}');
    const [payloadError, setPayloadError] = useState<string | null>(null);
    const [listenEvent, setListenEvent] = useState("pong_client");

    const addMessage = (msg: Omit<Message, "id" | "time">) => {
        setMessages((prev) => [
            {
                ...msg,
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
            },
            ...prev,
        ]);
    };

    useEffect(() => {
        const handler = (data: any) => {
            addMessage({ direction: "received", event: listenEvent, data });
        };
        on(listenEvent, handler);
        return () => off(listenEvent, handler);
    }, [listenEvent]);

    const validatePayload = (raw: string) => {
        try {
            JSON.parse(raw);
            setPayloadError(null);
            return true;
        } catch {
            setPayloadError("Invalid JSON");
            return false;
        }
    };

    const handleEmit = () => {
        if (!event.trim()) return;
        if (!validatePayload(payload)) return;
        const parsed = JSON.parse(payload);
        emit(event, parsed);
        addMessage({ direction: "sent", event, data: parsed });
    };

    return (
        <div className="flex flex-col gap-4">

            {/* Heading */}
            <div className="flex flex-col gap-1">
                <h1 className="text-[18px] font-bold text-text tracking-[-0.3px]">Socket Test</h1>
                <p className="text-[12px] font-mono text-text-muted">
                    Emit events and watch responses in real time.
                </p>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-pos" : "bg-neg"}`} />
                <span className="text-[11px] font-mono text-text-muted">
                    {connected ? "Connected to server" : "Disconnected"}
                </span>
            </div>

            <div className="grid grid-cols-[340px_1fr] gap-3.5 items-start">

                {/* ── Controls ── */}
                <motion.div
                    className="bg-surface border border-border rounded-[10px] overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="px-[18px] py-[13px] border-b border-border">
                        <span className="text-[13px] font-semibold text-text">Emit</span>
                    </div>
                    <div className="p-[18px] flex flex-col gap-3">

                        {/* Event name */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-mono text-text-muted tracking-[0.1em] uppercase">Event</label>
                            <input
                                className="bg-surface2 border border-border2 rounded-[7px] px-3 py-2 text-[12px] font-mono text-text outline-none focus:border-accent transition-colors placeholder:text-text-faint"
                                value={event}
                                onChange={(e) => setEvent(e.target.value)}
                                placeholder="event_name"
                            />
                        </div>

                        {/* Payload */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-mono text-text-muted tracking-[0.1em] uppercase">Payload (JSON)</label>
                            <textarea
                                className={`bg-surface2 border rounded-[7px] px-3 py-2 text-[11px] font-mono text-text outline-none transition-colors placeholder:text-text-faint resize-none leading-relaxed ${payloadError ? "border-neg" : "border-border2 focus:border-accent"
                                    }`}
                                value={payload}
                                onChange={(e) => {
                                    setPayload(e.target.value);
                                    validatePayload(e.target.value);
                                }}
                                rows={5}
                            />
                            {payloadError && (
                                <span className="text-[10px] font-mono text-neg">{payloadError}</span>
                            )}
                        </div>

                        <button
                            className="flex items-center justify-center px-4 py-2 rounded-[7px] bg-accent text-white text-[12px] font-semibold font-mono tracking-[0.03em] transition-opacity hover:opacity-85 active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
                            onClick={handleEmit}
                            disabled={!connected || !event.trim() || !!payloadError}
                        >
                            Emit →
                        </button>

                        {/* Divider */}
                        <div className="border-t border-border pt-3 flex flex-col gap-1.5">
                            <label className="text-[9px] font-mono text-text-muted tracking-[0.1em] uppercase">Listening for event</label>
                            <input
                                className="bg-surface2 border border-border2 rounded-[7px] px-3 py-2 text-[12px] font-mono text-text outline-none focus:border-accent transition-colors placeholder:text-text-faint"
                                value={listenEvent}
                                onChange={(e) => setListenEvent(e.target.value)}
                                placeholder="event_name"
                            />
                            <p className="text-[9px] font-mono text-text-faint">
                                Changing this re-registers the listener.
                            </p>
                        </div>

                        {/* Clear */}
                        <button
                            className="flex items-center justify-center px-4 py-2 rounded-[7px] border border-border text-text-muted text-[12px] font-mono tracking-[0.03em] transition-opacity hover:opacity-70 active:scale-[0.98]"
                            onClick={() => setMessages([])}
                        >
                            Clear Log
                        </button>
                    </div>
                </motion.div>

                {/* ── Message log ── */}
                <motion.div
                    className="bg-surface border border-border rounded-[10px] overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-border">
                        <span className="text-[13px] font-semibold text-text">Event Log</span>
                        <span className="text-[9px] font-mono text-text-faint">{messages.length} events</span>
                    </div>

                    <div className="p-[18px] flex flex-col gap-2 max-h-[520px] overflow-y-auto">
                        {messages.length === 0 && (
                            <p className="text-[11px] font-mono text-text-faint text-center py-8">
                                No events yet — emit something.
                            </p>
                        )}
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                className={`rounded-[7px] px-3.5 py-3 flex flex-col gap-1.5 border ${msg.direction === "sent"
                                        ? "bg-accent-dim border-accent-border"
                                        : "bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.2)]"
                                    }`}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-mono font-semibold tracking-[0.12em] ${msg.direction === "sent" ? "text-accent" : "text-pos"
                                            }`}>
                                            {msg.direction === "sent" ? "↑ SENT" : "↓ RECEIVED"}
                                        </span>
                                        <span className="text-[9px] font-mono text-text-faint bg-surface2 px-1.5 py-[2px] rounded-[4px] border border-border">
                                            {msg.event}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-text-faint">{msg.time}</span>
                                </div>
                                <pre className="font-mono text-[11px] text-text-muted whitespace-pre-wrap break-all leading-relaxed m-0 max-h-[120px] overflow-y-auto">
                                    {JSON.stringify(msg.data, null, 2)}
                                </pre>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}