// FOR PLUGINS (installed, running)
export type PluginStatus = "up-to-date" | "update-available" | "higher-version";
export type CommandField = {
    key: string;
    flag: string;
    label: string;
    type: "text" | "boolean" | "number" | "select";
    placeholder?: string;
    required?: boolean;
    default?: any;
    options?: string[];
};
export type PluginCommand = {
    name: string;
    description: string;
    fields: CommandField[];
};
export type Plugin = {
    name: string;
    namespace: string;
    version: string;
    description: string;
    commands: PluginCommand[];
    linked: boolean;
    localPath: string | null;
    installedAt: string;
    latestVersion: string;
    status: PluginStatus;
};

// FOR AVAILABLE PLUGIN (catalog / browsing)
export type AvailablePlugin = {
    namespace: string;
    package: string;
    official: boolean;
    approved: boolean | null;
    submitted_profile: string | null;
    submitted_by: string | null;
    createdAt: string;

    description: string;
    commands: string[];
    installed: boolean;

    latestVersion: string | null;
    installedVersion: string | null;

    npmVersion: string | null;
    weeklyDownloads: number | null;
    linked: boolean;
    localPath: string | null;
    readme: string | null;
};

// ─── MANAGE — PARTIALS ────────────────────────────────────────
// A partial is the user's personal workspace / draft for a plugin.
// Fully editable: namespace, package, version, link_path.
// Pushing a partial creates a new ManagedPlugin version row.
// Deleting a partial NEVER touches plugins.

export type PluginPartial = {
    id: string;
    namespace: string;
    package: string;
    version: string;
    link_path: string;
    submitted_by: string;
    created_at: string;
    description: string;
    commands: PluginCommand[];
};

// ─── MANAGE — PUBLISHED PLUGINS ──────────────────────────────
// A published plugin row. Created by pushing a partial.
// User can only delete (removes all version rows for that namespace).
// Deleting plugins NEVER touches plugin_partials.

export type ManagedPlugin = {
    id: string;
    namespace: string;
    package: string;
    version: string;
    description: string;
    commands: string[];
    is_official: boolean;
    approved: boolean | null;
    submitted_by: string;
    created_at: string;
};

// ─── MANAGE — UI TYPES ────────────────────────────────────────

export type PartialFilter = "all" | "linked" | "not-linked";
export type PluginFilter = "all" | "pending" | "approved" | "rejected";

/** @deprecated — use PartialFilter or PluginFilter */
export type ManageFilter = "all" | "linked" | "not-linked" | "pushed";

export type PartialFormModal = {
    mode: "new" | "edit";
    partial: Partial<PluginPartial>;
};

/** @deprecated — use PartialFormModal */
export type PluginFormModal = {
    mode: "new" | "edit";
    plugin: Partial<AvailablePlugin>;
};

// ─── TOAST ────────────────────────────────────────────────────
export type ToastState = { message: string; type: "success" | "neg" } | null;

// ─── PLUGIN RUNNER ────────────────────────────────────────────
export type LogLine = { type: "line" | "done" | "error"; text: string; success?: boolean };
export type FieldType = "text" | "select" | "boolean";
export type Field = {
    key: string;
    label: string;
    flag: string;
    type: FieldType;
    placeholder?: string;
    options?: string[];
    default?: string | boolean;
    required?: boolean;
};
export type Command = {
    name: string;
    description: string;
    fields: Field[];
};
export type PluginSchema = {
    namespace: string;
    description: string;
    commands: Command[];
};