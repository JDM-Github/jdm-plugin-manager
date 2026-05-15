import { motion } from "framer-motion";
import type { LogLine } from "../../lib/types";

export default function LogLineComponent({ line, index }: { line: LogLine; index: number }) {
    const text = line.text ?? "";
    const color =
        line.type === "done" ? (line.success ? "text-pos" : "text-neg") :
            line.type === "error" ? "text-neg" :
                text.includes("✔") || text.includes("✓") ? "text-pos" :
                    text.includes("✖") || text.includes("✗") || text.includes("FAIL") ? "text-neg" :
                        text.includes("⚠") ? "text-neu" :
                            text.startsWith("  ·") || text.startsWith("    ·") ? "text-text-faint" :
                                "text-text-muted";

    const bar =
        line.type === "done" ? (line.success ? "bg-pos/40" : "bg-neg/40") :
            line.type === "error" ? "bg-neg/40" :
                color === "text-pos" ? "bg-pos/40" :
                    color === "text-neg" ? "bg-neg/40" :
                        color === "text-neu" ? "bg-neu/40" :
                            "bg-border";

    return (
        <motion.div
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.08 }}
        >
            <div className={`w-[2px] self-stretch rounded-full shrink-0 mt-[3px] ${bar}`} />
            <span className="text-[10px] font-mono text-text-faint/40 shrink-0 pt-[1px] w-5 text-right" style={{ userSelect: "none" }}>
                {index + 1}
            </span>
            <span className={`text-[11px] font-mono leading-relaxed ${color}`} style={{ userSelect: "text" }}>
                {line.type === "done"
                    ? line.success
                        ? "✔  Process exited successfully"
                        : "✖  Process exited with errors"
                    : text
                }
            </span>
        </motion.div>
    );
}