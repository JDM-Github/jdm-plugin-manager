import { ApiClient } from "./client";
import type { PluginSchema } from "../lib/types";

export const pluginApi = {
    async getSchema(namespace: string): Promise<PluginSchema> {
        const res = await ApiClient.get<PluginSchema>(`plugin/${namespace}/schema`);
        if (!res.success) throw new Error(res.message ?? "Failed to load schema");
        return res.data!;
    },
    async getCwd(): Promise<string> {
        const res = await ApiClient.get<{ cwd: string }>("plugin/cwd");
        if (!res.success) throw new Error("Failed to get working directory");
        return res.data!.cwd;
    },
    async browseFolder(): Promise<string | null> {
        const res = await ApiClient.get<{ cwd: string }>("plugin/browse-folder");
        if (!res.success) return null;
        return res.data!.cwd;
    }
};
