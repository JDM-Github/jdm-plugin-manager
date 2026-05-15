import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../lib/context/auth_context";
import Spinner from "../Spinner";

export default function AnonymousGate() {
    const { loginWithNpm, status, error, clearError } = useAuth();
    const checking = status === "checking";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-6 py-24"
        >
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-[12px] bg-surface border border-border flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-text-faint" aria-hidden>
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
                <div>
                    <p className="text-[13px] font-mono font-semibold text-text">
                        Authentication required
                    </p>
                    <p className="text-[11px] font-mono text-text-faint mt-1 max-w-[280px] leading-relaxed">
                        Manage is only available to npm-authenticated users.
                        Anonymous accounts cannot create or push plugins.
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        className="flex items-center justify-between gap-4 px-3.5 py-2.5 rounded-[8px] bg-surface border border-neg/30 text-neg text-[10px] font-mono max-w-sm w-full overflow-hidden"
                    >
                        <span>⚠ {error}</span>
                        <button className="text-text-muted hover:text-text transition-colors shrink-0" onClick={clearError}>✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-accent text-bg text-[11px] font-mono font-bold hover:opacity-85 transition-opacity disabled:opacity-50"
                onClick={loginWithNpm}
                disabled={checking}
            >
                {checking
                    ? <><Spinner size={11} /> Checking npm…</>
                    : <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M0 0h24v24H0V0zm4 20h7v-7h2v7h2V4H4v16zm9-14h2v4h-2V6z" />
                        </svg>
                        Login with npm
                    </>
                }
            </motion.button>

            <p className="text-[9px] font-mono text-text-faint/50">
                Run <span className="text-accent/50">npm login</span> in your terminal first.
            </p>
        </motion.div>
    );
}