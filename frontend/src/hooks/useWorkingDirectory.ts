import { useState, useCallback } from "react";
import { pluginApi } from "../api/pluginApi";

export function useWorkingDirectory(onPathResolved: (path: string) => void) {
    const [loading, setLoading] = useState(false);

    const fetchCwd = useCallback(async () => {
        setLoading(true);
        try {
            const cwd = await pluginApi.getCwd();
            onPathResolved(cwd);
        } catch (err) {
            console.error("Failed to fetch CWD:", err);
        } finally {
            setLoading(false);
        }
    }, [onPathResolved]);

    const browseFolder = useCallback(async () => {
        try {
            const picked = await pluginApi.browseFolder();
            if (picked) { onPathResolved(picked); return; }
            if (picked === null) return;
        } catch (_) { }

        if (typeof (window as any).electronAPI?.openFolder === "function") {
            const picked = await (window as any).electronAPI.openFolder();
            if (picked) onPathResolved(picked);
            return;
        }

        if (typeof (window as any).showDirectoryPicker === "function") {
            try {
                const handle = await (window as any).showDirectoryPicker({ mode: "read" });
                // Can't derive full path from File System Access API — just use the name
                onPathResolved(handle.name);
            } catch (err: any) {
                if (err?.name !== "AbortError") console.error(err);
            }
            return;
        }

        const input = window.prompt("Paste the full folder path:");
        if (input !== null && input.trim()) onPathResolved(input.trim());
    }, [onPathResolved]);

    return { loading, fetchCwd, browseFolder };
}