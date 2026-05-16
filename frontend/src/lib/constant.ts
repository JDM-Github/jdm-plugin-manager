// ╔══════════════════════════════════════════════════════════╗
// ║        AUTO-GENERATED — DO NOT MANUALLY EDIT             ║
// ║     Change values in electron-flask.json instead         ║
// ╚══════════════════════════════════════════════════════════╝
export const VERSION  = "1.0.1";
export const APP_NAME = "JDM Plugin Manager";

// START CONSTANT HERE
// export const SOME_CONSTANT
import type { PluginStatus } from "./types.ts";

export const STATUS_CFG: Record<
    PluginStatus,
    { label: string; color: string; bg: string; border: string; dot: string }
> = {
    "up-to-date": {
        label: "UP TO DATE",
        color: "text-pos",
        bg: "bg-pos/5",
        border: "border-pos/15",
        dot: "bg-pos",
    },
    "update-available": {
        label: "UPDATE AVAILABLE",
        color: "text-neu",
        bg: "bg-neu/5",
        border: "border-neu/20",
        dot: "bg-neu",
    },
    "higher-version": {
        label: "HIGHER VERSION",
        color: "text-neg",
        bg: "bg-neg/5",
        border: "border-neg/20",
        dot: "bg-neg",
    },
};

export const MOTION_CONTAINER = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
};

export const MOTION_ROW = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

export type AvailableFilter = "all" | "installed" | "not-installed";

export const FILTERS: AvailableFilter[] = ["all", "installed", "not-installed"]
export const FILTER_LABELS: Record<AvailableFilter, string> = {
    "all": "All",
    "installed": "Installed",
    "not-installed": "Not Installed",
};

export const MOTION_CARD = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};