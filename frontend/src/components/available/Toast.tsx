import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
    message: string;
    type: "success" | "neg";
    onDismiss: () => void;
    duration?: number;
};

export function Toast({ message, type, onDismiss, duration = 3500 }: Props) {
    const isSuccess = type === "success";
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(onDismiss, duration);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [duration, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16, scale: 0.94, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, scale: 0.96, filter: "blur(2px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={`
                relative flex items-start gap-3 px-4 pt-3.5 pb-4
                rounded-[14px] border shadow-xl shadow-black/10
                min-w-[260px] max-w-[340px] overflow-hidden
                ${isSuccess
                    ? "bg-surface border-pos/20"
                    : "bg-surface border-neg/20"
                }
            `}
            role="alert"
        >
            {/* Glow strip at top */}
            <div className={`absolute inset-x-0 top-0 h-[2px] ${isSuccess ? "bg-pos/60" : "bg-neg/60"}`} />

            {/* Icon */}
            <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.06 }}
                className={`
                    mt-0.5 flex items-center justify-center w-7 h-7 rounded-full shrink-0
                    ${isSuccess ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg"}
                `}
            >
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-[13px] leading-none font-bold"
                >
                    {isSuccess ? "✓" : "✕"}
                </motion.span>
            </motion.div>

            {/* Body */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0 pt-0.5">
                <p className="text-[12px] font-mono font-semibold text-text leading-snug">
                    {isSuccess ? "Success" : "Error"}
                </p>
                <p className="text-[11px] font-mono text-text-muted leading-relaxed truncate">
                    {message}
                </p>
            </div>

            {/* Dismiss button */}
            <button
                onClick={onDismiss}
                className="mt-0.5 text-text-faint hover:text-text transition-colors text-[13px] leading-none shrink-0"
                aria-label="Dismiss"
            >
                ✕
            </button>

            {/* Progress bar */}
            <motion.div
                className={`absolute bottom-0 left-0 h-[2px] ${isSuccess ? "bg-pos/50" : "bg-neg/50"}`}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
            />
        </motion.div>
    );
}

/* Wrap this around your app root (or at the page level) to portal toasts */
export function ToastContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
            <div className="pointer-events-auto flex flex-col gap-2 items-end">
                <AnimatePresence mode="popLayout">
                    {children}
                </AnimatePresence>
            </div>
        </div>
    );
}