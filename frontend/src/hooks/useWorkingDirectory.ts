import { useState, useCallback } from "react";
import { pluginApi } from "../api/pluginApi";

export function useWorkingDirectory() {
    const [workDir, setWorkDir] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchCwd = useCallback(async () => {
        setLoading(true);
        try {
            const cwd = await pluginApi.getCwd();
            setWorkDir(cwd);
        } catch (err) {
            console.error("Failed to fetch CWD:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const browseFolder = useCallback(async () => {
        try {
            const picked = await pluginApi.browseFolder();
            if (picked) { setWorkDir(picked); return; }
            if (picked === null) return;
        } catch (_) { }

        if (typeof (window as any).electronAPI?.openFolder === "function") {
            const picked = await (window as any).electronAPI.openFolder();
            if (picked) setWorkDir(picked);
            return;
        }

        if (typeof (window as any).showDirectoryPicker === "function") {
            try {
                const handle = await (window as any).showDirectoryPicker({ mode: "read" });
                setWorkDir(prev => {
                    const parent = prev.replace(/[\\/][^\\/]+$/, "");
                    const sep = parent.includes("\\") ? "\\" : "/";
                    return parent ? `${parent}${sep}${handle.name}` : handle.name;
                });
            } catch (err: any) {
                if (err?.name !== "AbortError") console.error(err);
            }
            return;
        }
        const input = window.prompt("Paste the full folder path:", workDir);
        if (input !== null && input.trim()) setWorkDir(input.trim());
    }, [workDir]);

    return { workDir, setWorkDir, loading, fetchCwd, browseFolder };
}