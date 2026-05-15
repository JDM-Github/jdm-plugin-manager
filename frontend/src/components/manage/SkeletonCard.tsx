import { motion } from "framer-motion";

export default function SkeletonCard({ delay }: { delay: number }) {
    return (
        <motion.div
            className="h-[200px] rounded-[12px] bg-surface border border-border overflow-hidden relative"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.25 }}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: delay * 0.5, ease: "easeInOut" }}
            />
            <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-3 items-center justify-between">
                    <div className="flex gap-3 items-center">
                        <div className="w-9 h-9 rounded-[8px] bg-border/60" />
                        <div className="flex flex-col gap-1.5">
                            <div className="h-2.5 w-28 rounded bg-border/60" />
                            <div className="h-2 w-16 rounded bg-border/40" />
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <div className="h-6 w-10 rounded-[6px] bg-border/40" />
                        <div className="h-6 w-12 rounded-[6px] bg-border/40" />
                    </div>
                </div>
                <div className="h-2 w-full rounded bg-border/30" />
                <div className="h-2 w-3/4 rounded bg-border/25" />
                <div className="flex gap-2 mt-auto pt-2 border-t border-border/30">
                    <div className="h-2 w-16 rounded bg-border/30" />
                </div>
            </div>
        </motion.div>
    );
}