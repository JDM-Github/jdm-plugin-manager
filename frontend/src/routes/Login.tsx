// ─── Login.tsx ───────────────────────────────────────────────
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/context/auth_context";
import Background from "../components/Background";

// ── Tiny reusable spinner (matches your codebase style) ──────
function Spinner({ size = 13 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className="animate-spin shrink-0"
            aria-hidden
        >
            <circle
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="40 20"
                className="opacity-30"
            />
            <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}

function TerminalLine({ text, delay = 0 }: { text: string; delay?: number }) {
    return (
        <motion.div
            className="flex items-center gap-2 text-[10px] font-mono text-text-faint"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.22 }}
        >
            <span className="text-accent/50">$</span>
            <span>{text}</span>
        </motion.div>
    );
}

// ── Main component ────────────────────────────────────────────
export default function Login() {
    const { loginWithNpm, loginAnonymous, status, error, clearError } = useAuth();

    const [mode, setMode] = useState<"pick" | "anonymous">("pick");
    const [anonName, setAnonName] = useState("");

    const isChecking = status === "checking";

    const handleNpm = () => {
        clearError();
        loginWithNpm();
    };

    const handleAnonymous = () => {
        if (mode === "pick") {
            setMode("anonymous");
            return;
        }
        loginAnonymous(anonName || "anonymous");
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">

            <Background />

            {/* ── Background grid texture ── */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.025]"
                style={{
                    backgroundImage:
                        "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />

            {/* ── Radial accent glow ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 55% 40% at 50% 45%, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent 70%)",
                }}
            />

            {/* ── Card ── */}
            <motion.div
                className="relative z-10 w-full max-w-[360px] mx-4"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 30, delay: 0.05 }}
            >
                {/* Top chrome bar */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-surface border border-b-0 border-border rounded-t-[14px]">
                    {["bg-neg/70", "bg-accent/40", "bg-pos/50"].map((c, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                    ))}
                    <span className="ml-auto text-[9px] font-mono text-text-faint/40 tracking-widest">
                        JDM PLUGIN MANAGER
                    </span>
                </div>

                {/* Main panel */}
                <div className="bg-surface border border-border rounded-b-[14px] px-6 pt-5 pb-6 flex flex-col gap-5">

                    {/* Header */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-display text-[22px] font-black text-accent glow-accent-text tracking-[0.06em] leading-none">
                                JDM
                            </span>
                        </div>
                        <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                            Sign in with your npm account or continue as a guest.
                        </p>
                    </div>

                    {/* Terminal preview */}
                    <div className="bg-bg border border-border/60 rounded-[8px] px-3 py-2.5 flex flex-col gap-1.5">
                        <TerminalLine text="npm whoami" delay={0.15} />
                        <motion.div
                            className="flex items-center gap-2 text-[10px] font-mono"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <span className="text-pos/70">→</span>
                            <span className="text-text-faint">
                                {isChecking ? (
                                    <span className="flex items-center gap-1.5">
                                        <Spinner size={10} />
                                        resolving…
                                    </span>
                                ) : (
                                    "user-0001"
                                )}
                            </span>
                        </motion.div>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-[7px] bg-neg/5 border border-neg/20 text-neg text-[10px] font-mono overflow-hidden"
                            >
                                <span className="leading-relaxed">⚠ {error}</span>
                                <button
                                    onClick={clearError}
                                    className="text-neg/50 hover:text-neg transition-colors mt-px shrink-0"
                                >
                                    ✕
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Buttons */}
                    <div className="flex flex-col gap-2.5">

                        {/* npm login */}
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            disabled={isChecking}
                            onClick={handleNpm}
                            className="group relative flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-[8px] bg-accent text-bg text-[11px] font-mono font-bold tracking-[0.05em] hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-40 overflow-hidden"
                        >
                            {/* shine sweep */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                            {isChecking ? (
                                <>
                                    <Spinner size={12} />
                                    Checking npm…
                                </>
                            ) : (
                                <>
                                    Login with npm
                                </>
                            )}
                        </motion.button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-border/50" />
                            <span className="text-[9px] font-mono text-text-faint/40 tracking-widest">OR</span>
                            <div className="flex-1 h-px bg-border/50" />
                        </div>

                        {/* Anonymous */}
                        <AnimatePresence mode="wait">
                            {mode === "pick" ? (
                                <motion.button
                                    key="anon-btn"
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isChecking}
                                    onClick={handleAnonymous}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[8px] border border-border text-text-faint text-[11px] font-mono hover:border-accent/30 hover:text-text transition-all disabled:opacity-40"
                                >
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                                        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    Continue as anonymous
                                </motion.button>
                            ) : (
                                <motion.div
                                    key="anon-input"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-col gap-2"
                                >
                                    <label className="text-[10px] font-mono text-text-faint">
                                        Display name <span className="text-text-faint/40">(optional)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            className="flex-1 bg-bg border border-border rounded-[6px] px-3 py-2 text-[11px] font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
                                            placeholder="anonymous"
                                            value={anonName}
                                            maxLength={32}
                                            onChange={e => setAnonName(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleAnonymous()}
                                        />
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleAnonymous}
                                            className="px-3 py-2 rounded-[6px] bg-accent/10 border border-accent/25 text-accent text-[10px] font-mono font-bold hover:bg-accent/15 transition-colors"
                                        >
                                            Go
                                        </motion.button>
                                        <button
                                            onClick={() => { setMode("pick"); setAnonName(""); }}
                                            className="px-2.5 py-2 rounded-[6px] border border-border text-text-faint text-[10px] font-mono hover:text-text transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer hint */}
                    <p className="text-[9px] font-mono text-text-faint/40 text-center leading-relaxed">
                        npm login reads from <span className="text-text-faint/60">~/.npmrc</span> on your machine
                    </p>
                </div>
            </motion.div>
        </div>
    );
}