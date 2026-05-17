// ─── PluginRunner.tsx ─────────────────────────────────────────
import { useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import type { Command, TabState } from "../lib/types";
import { useCommandForm } from "../hooks/useCommandForm";
import { usePluginSchema } from "../hooks/usePluginSchema";
import { useWorkingDirectory } from "../hooks/useWorkingDirectory";
import { useRunnerSocket } from "../socket/hooks/useRunnerSocket";
import { createRunnerHandlers } from "../socket/handlers/runnerHandlers";
import { SocketEvents } from "../socket/events";
import SocketHandler from "../lib/utilities/socket_handler";
import WorkingDirectoryBar from "../components/runner/WorkingDirectoryBar";
import ConfigPanel from "../components/runner/ConfigPanel";
import TerminalPanel from "../components/runner/TerminalPanel";
import Breadcrumb from "../components/Breadcrumb";
import CommandPanel from "../components/runner/CommandPanel";
import TabBar from "../components/runner/TabBar";
import { createTab } from "../lib/utils";
import { usePersistedStore } from "../hooks/usePresistedStore";
import { saveRunningTab } from "../lib/pendingNotifications";
import { markRunning } from "../hooks/useRunningNamespaces";

const PANEL_H = "h-[calc(100vh-280px)]";
const TERMINAL_H = "h-[calc(100vh-190px)]";

// ─────────────────────────────────────────────────────────────
export default function PluginRunner() {
    const { namespace } = useParams<{ namespace: string }>();
    const navigate = useNavigate();

    const { schema, loading: schemaLoading, error: schemaError } = usePluginSchema();
    const { runCommand, sendAnswer, subscribeToEvents, unsubscribeFromEvents, emit } = useRunnerSocket();
    const { store, setStore } = usePersistedStore(namespace!);
    const location = useLocation();

    const tabs = store?.tabs ?? [];
    const activeTabId = store?.activeTabId ?? "";
    const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0] ?? null;

    useEffect(() => {
        const tabId = (location.state as { tabId?: string } | null)?.tabId;
        if (!tabId || !store) return;
        const exists = store.tabs.some(t => t.id === tabId);
        if (exists) {
            setStore(prev => ({ ...prev, activeTabId: tabId }));
        }
    }, [location.state, store?.tabs.map(t => t.id).join(",")]);

    const updateTab = useCallback((
        id: string,
        patch: Partial<TabState> | ((prev: TabState) => Partial<TabState>)
    ) => {
        setStore(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => {
                if (t.id !== id) return t;
                const delta = typeof patch === "function" ? patch(t) : patch;
                return { ...t, ...delta };
            }),
        }));
    }, [setStore]);

    const addTab = useCallback(() => {
        setStore(prev => {
            const next = createTab(prev.tabs.length + 1);
            return { tabs: [...prev.tabs, next], activeTabId: next.id };
        });
    }, [setStore]);

    const closeTab = useCallback((id: string) => {
        setStore(prev => {
            if (prev.tabs.length === 1) return prev;
            const idx = prev.tabs.findIndex(t => t.id === id);
            const remaining = prev.tabs.filter(t => t.id !== id);
            const nextActive = prev.activeTabId === id
                ? (remaining[Math.max(0, idx - 1)]?.id ?? remaining[0].id)
                : prev.activeTabId;
            return { tabs: remaining, activeTabId: nextActive };
        });
    }, [setStore]);

    // ── workDir per-tab ───────────────────────────────────────
    const handlePathResolved = useCallback((path: string) => {
        updateTab(activeTabId, { workDir: path });
    }, [activeTabId, updateTab]);

    const { loading: pathLoading, fetchCwd, browseFolder } = useWorkingDirectory(handlePathResolved);

    // ── useCommandForm ────────────────────────────────────────
    const { validate, buildArgs, buildPreview } = useCommandForm({
        activeCommand: activeTab?.activeCommand ?? null,
        fieldValues: activeTab?.fieldValues ?? {},
    });

    // ── Command select ────────────────────────────────────────
    const handleSelectCommand = useCallback((cmd: Command) => {
        const defaults: Record<string, string | boolean> = {};
        for (const f of cmd.fields) {
            if (f.default !== undefined) defaults[f.key] = f.default;
        }
        updateTab(activeTabId, {
            activeCommand: cmd,
            fieldValues: defaults,
            logs: [],
            done: false,
            exitOk: false,
            prompt: null,
            promptInput: "",
        });
    }, [activeTabId, updateTab]);

    const handleKill = useCallback(() => {
        emit(SocketEvents.RUN_KILL, { tab_id: activeTabId });
    }, [activeTabId, emit]);

    const handleUpdateField = useCallback((key: string, value: string | boolean) => {
        updateTab(activeTabId, prev => ({
            fieldValues: { ...prev.fieldValues, [key]: value },
        }));
    }, [activeTabId, updateTab]);

    // ── Socket events ─────────────────────────────────────────
    useEffect(() => {
        const handlers = createRunnerHandlers({
            onLine: (tabId, text) =>
                updateTab(tabId, prev => ({
                    logs: [...prev.logs, { type: "line", text }],
                })),

            // Notifications are handled globally in useGlobalRunnerNotifications
            // Just update state here
            onDone: (tabId, success) =>
                updateTab(tabId, prev => ({
                    logs: [...prev.logs, { type: "done", text: "", success }],
                    running: false,
                    done: true,
                    exitOk: success,
                    prompt: null,
                })),

            onError: (tabId, text) =>
                updateTab(tabId, prev => ({
                    logs: [...prev.logs, { type: "error", text }],
                    running: false,
                    done: true,
                    exitOk: false,
                    prompt: null,
                })),

            onPrompt: (tabId, text) =>
                updateTab(tabId, { prompt: text, promptInput: "" }),
        });

        subscribeToEvents(handlers);
        return () => unsubscribeFromEvents(handlers);
    }, [updateTab, subscribeToEvents, unsubscribeFromEvents]);

    // ── Reconnect + replay ────────────────────────────────────
    useEffect(() => {
        const onReplay = (data: { tab_id: string; lines: { type: string; text: string }[] }) => {
            updateTab(data.tab_id, () => ({
                logs: data.lines.map(l => ({
                    type: "line" as const,
                    text: l.type === "prompt" ? `  ? ${l.text}` : l.type === "answer" ? `  ↳ ${l.text}` : l.text,
                })),
            }));
        };

        const onResume = (data: { tab_id: string }) => {
            updateTab(data.tab_id, prev => ({
                running: true,
                done: false,
                logs: [
                    ...prev.logs,
                    { type: "line", text: "⟳ Reconnected — command still running..." },
                ],
            }));
        };

        const sendReconnect = () => {
            setStore(prev => {
                if (!prev) return prev;
                const tabIds = prev.tabs.map(t => t.id);
                emit(SocketEvents.RECONNECT_TABS, { tab_ids: tabIds });
                return prev;
            });
        };

        SocketHandler.on(SocketEvents.RUN_REPLAY, onReplay);
        SocketHandler.on(SocketEvents.RUN_RESUME, onResume);
        SocketHandler.on("connect", sendReconnect);

        return () => {
            SocketHandler.off(SocketEvents.RUN_REPLAY, onReplay);
            SocketHandler.off(SocketEvents.RUN_RESUME, onResume);
            SocketHandler.off("connect", sendReconnect);
        };
    }, []);

    const didReconnect = useRef(false);
    useEffect(() => {
        if (!store || didReconnect.current) return;
        didReconnect.current = true;
        const tabIds = store.tabs.map(t => t.id);
        emit(SocketEvents.RECONNECT_TABS, { tab_ids: tabIds });
    }, [store]);

    useEffect(() => {
        didReconnect.current = false;
    }, [namespace]);

    const handleRun = useCallback(() => {
        if (!activeTab?.activeCommand || !namespace || activeTab.running) return;

        const validationError = validate();
        if (validationError) {
            updateTab(activeTabId, { logs: [{ type: "error", text: validationError }] });
            return;
        }

        updateTab(activeTabId, {
            running: true,
            done: false,
            exitOk: false,
            logs: [],
            prompt: null,
            promptInput: "",
        });

        saveRunningTab(activeTabId, {
            label: activeTab.label,
            namespace: namespace,
        });
        markRunning(namespace);
        emit(SocketEvents.RUN_CLEAR, { tab_id: activeTabId });
        runCommand({
            tabId: activeTabId,
            namespace,
            command: activeTab.activeCommand.name,
            args: buildArgs(),
            cwd: activeTab.workDir || undefined,
        });
    }, [activeTab, activeTabId, namespace, validate, buildArgs, updateTab, runCommand, emit]);

    // ── Prompt answer ─────────────────────────────────────────
    const handlePromptSubmit = useCallback(() => {
        if (!activeTab || activeTab.prompt === null) return;
        const { prompt, promptInput } = activeTab;
        updateTab(activeTabId, prev => ({
            logs: [
                ...prev.logs,
                { type: "line", text: `  ? ${prompt}` },
                { type: "line", text: `  ↳ ${promptInput || "(empty)"}` },
            ],
            prompt: null,
            promptInput: "",
        }));
        sendAnswer(activeTabId, promptInput);
    }, [activeTab, activeTabId, updateTab, sendAnswer]);

    // ── Early returns (after all hooks) ──────────────────────
    if (!store) return (
        <div className="flex items-center justify-center h-64">
            <span className="text-[11px] font-mono text-text-faint animate-pulse">
                Restoring sessions...
            </span>
        </div>
    );

    if (schemaLoading) return (
        <div className="flex items-center justify-center h-64">
            <span className="text-[11px] font-mono text-text-faint animate-pulse">
                Loading plugin schema...
            </span>
        </div>
    );

    if (schemaError || !schema) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-[13px] font-mono text-neg">
                {schemaError ?? `Plugin "${namespace}" not found.`}
            </p>
            <button
                className="text-[11px] font-mono text-accent hover:opacity-70 transition-opacity"
                onClick={() => navigate("/plugins")}
            >← Back to plugins</button>
        </div>
    );

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-1.5">

            <Breadcrumb
                namespace={schema.namespace}
                commandCount={schema.commands.length}
                activeCommand={activeTab?.activeCommand ?? null}
                onBack={() => navigate("/plugins")}
                textBreadcrumb="Installed"
            />

            <div className="grid grid-cols-2 gap-1.5">

                {/* Left panel */}
                <div className="flex flex-col gap-1.5">
                    <TabBar
                        tabs={tabs.map(t => ({ id: t.id, label: t.label, running: t.running, done: t.done, exitOk: t.exitOk }))}
                        activeTabId={activeTabId}
                        onSelect={id => setStore(prev => ({ ...prev, activeTabId: id }))}
                        onAdd={addTab}
                        onClose={closeTab}
                        onRename={(id, label) => updateTab(id, { label })}
                    />

                    <WorkingDirectoryBar
                        workDir={activeTab?.workDir ?? ""}
                        setWorkDir={path => updateTab(activeTabId, { workDir: path })}
                        loading={pathLoading}
                        onFetchCwd={fetchCwd}
                        onBrowseFolder={browseFolder}
                    />

                    <div className="grid grid-cols-[200px_1fr] gap-1.5">
                        <CommandPanel
                            schema={schema}
                            activeCommand={activeTab?.activeCommand ?? null}
                            panelHeight={PANEL_H}
                            running={activeTab?.running ?? false}
                            onSelect={handleSelectCommand}
                        />

                        <ConfigPanel
                            activeCommand={activeTab?.activeCommand ?? null}
                            fieldValues={activeTab?.fieldValues ?? {}}
                            running={activeTab?.running ?? false}
                            done={activeTab?.done ?? false}
                            exitOk={activeTab?.exitOk ?? false}
                            panelHeight={PANEL_H}
                            previewText={activeTab?.activeCommand ? buildPreview(schema.namespace) : ""}
                            onUpdateField={handleUpdateField}
                            onRun={handleRun}
                        />
                    </div>
                </div>

                {/* Right panel */}
                <TerminalPanel
                    logs={activeTab?.logs ?? []}
                    running={activeTab?.running ?? false}
                    done={activeTab?.done ?? false}
                    exitOk={activeTab?.exitOk ?? false}
                    prompt={activeTab?.prompt ?? null}
                    promptInput={activeTab?.promptInput ?? ""}
                    panelHeight={TERMINAL_H}
                    onPromptChange={val => updateTab(activeTabId, { promptInput: val })}
                    onPromptSubmit={handlePromptSubmit}
                    onClear={() => {
                        emit(SocketEvents.RUN_CLEAR, { tab_id: activeTabId });
                        updateTab(activeTabId, { logs: [], done: false, exitOk: false });
                    }}
                    onKill={handleKill}
                />

            </div>
        </div>
    );
}