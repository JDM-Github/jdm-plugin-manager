// ─── PluginRunner.tsx ─────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import type { Command, LogLine } from "../lib/types";
import { useCommandForm } from "../hooks/useCommandForm";
import { usePluginSchema } from "../hooks/usePluginSchema";
import { useWorkingDirectory } from "../hooks/useWorkingDirectory";
import { useRunnerSocket } from "../socket/hooks/useRunnerSocket";
import { createRunnerHandlers } from "../socket/handlers/runnerHandlers";

import WorkingDirectoryBar from "../components/runner/WorkingDirectoryBar";
import ConfigPanel from "../components/runner/ConfigPanel";
import TerminalPanel from "../components/runner/TerminalPanel";
import Breadcrumb from "../components/Breadcrumb";
import CommandPanel from "../components/runner/CommandPanel";

const PANEL_H = "h-[calc(100vh-240px)]";

export default function PluginRunner() {
    const { namespace } = useParams<{ namespace: string }>();
    const navigate = useNavigate();

    const { schema, loading: schemaLoading, error: schemaError } = usePluginSchema();
    const { workDir, setWorkDir, loading: pathLoading, fetchCwd, browseFolder } = useWorkingDirectory();
    const { runCommand, sendAnswer, subscribeToEvents, unsubscribeFromEvents } = useRunnerSocket();

    const [activeCommand, setActiveCommand] = useState<Command | null>(null);
    const { fieldValues, validate, buildArgs, buildPreview, updateField } = useCommandForm({ activeCommand });
    const handlersRef = useRef<Record<string, (data: any) => void> | null>(null);

    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [done, setDone] = useState(false);
    const [exitOk, setExitOk] = useState(false);
    const [prompt, setPrompt] = useState<string | null>(null);
    const [promptInput, setPromptInput] = useState("");

    // ── Reset when active command changes ─────────────────────
    useEffect(() => {
        if (!activeCommand) return;
        for (const f of activeCommand.fields) {
            if (f.default !== undefined) updateField(f.key, f.default);
        }
        setLogs([]);
        setDone(false);
        setExitOk(false);
        setPrompt(null);
        setPromptInput("");
    }, [activeCommand, updateField]);

    useEffect(() => {
        const handlers = createRunnerHandlers({
            onLine: (text) => setLogs(prev => [...prev, { type: "line", text }]),
            onDone: (success) => {
                setLogs(prev => [...prev, { type: "done", text: "", success }]);
                setDone(true);
                setExitOk(success);
                setRunning(false);
                setPrompt(null);
                setPromptInput("");
            },
            onError: (text) => {
                setLogs(prev => [...prev, { type: "error", text }]);
                setDone(true);
                setExitOk(false);
                setRunning(false);
                setPrompt(null);
                setPromptInput("");
            },
            onPrompt: (text) => {
                setPrompt(text);
                setPromptInput("");
            },
        });
        handlersRef.current = handlers;
        subscribeToEvents(handlers);
        return () => {
            unsubscribeFromEvents(handlers);
            handlersRef.current = null;
        };
    }, []);

    // ── Run ───────────────────────────────────────────────────
    const handleRun = useCallback(() => {
        if (!activeCommand || !namespace || running) return;

        const validationError = validate();
        if (validationError) {
            setLogs([{ type: "error", text: validationError }]);
            return;
        }

        setRunning(true);
        setDone(false);
        setExitOk(false);
        setLogs([]);
        setPrompt(null);
        setPromptInput("");

        runCommand({
            namespace,
            command: activeCommand.name,
            args: buildArgs(),
            cwd: workDir || undefined,
        });
    }, [activeCommand, namespace, running, validate, buildArgs, workDir, runCommand]);

    // ── Prompt answer ─────────────────────────────────────────
    const handlePromptSubmit = useCallback(() => {
        if (prompt === null) return;
        setLogs(prev => [
            ...prev,
            { type: "line", text: `  ? ${prompt}` },
            { type: "line", text: `  ↳ ${promptInput || "(empty)"}` },
        ]);
        sendAnswer(promptInput);
        setPrompt(null);
        setPromptInput("");
    }, [prompt, promptInput, sendAnswer]);

    // ── Loading / error states ────────────────────────────────
    if (schemaLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="text-[11px] font-mono text-text-faint animate-pulse">
                    Loading plugin schema...
                </span>
            </div>
        );
    }

    if (schemaError || !schema) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <p className="text-[13px] font-mono text-neg">
                    {schemaError ?? `Plugin "${namespace}" not found.`}
                </p>
                <button
                    className="text-[11px] font-mono text-accent hover:opacity-70 transition-opacity"
                    onClick={() => navigate("/plugins")}
                >
                    ← Back to plugins
                </button>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-1.5">

            <Breadcrumb
                namespace={schema.namespace}
                commandCount={schema.commands.length}
                activeCommand={activeCommand}
                onBack={() => navigate("/plugins")}
                textBreadcrumb={"Installed"}
            />

            <WorkingDirectoryBar
                workDir={workDir}
                setWorkDir={setWorkDir}
                loading={pathLoading}
                onFetchCwd={fetchCwd}
                onBrowseFolder={browseFolder}
            />

            <div className="grid grid-cols-[200px_300px_1fr] gap-1.5">

                <CommandPanel
                    schema={schema}
                    activeCommand={activeCommand}
                    panelHeight={PANEL_H}
                    onSelect={setActiveCommand}
                />

                <ConfigPanel
                    activeCommand={activeCommand}
                    fieldValues={fieldValues}
                    running={running}
                    done={done}
                    exitOk={exitOk}
                    panelHeight={PANEL_H}
                    previewText={buildPreview(schema.namespace)}
                    onUpdateField={updateField}
                    onRun={handleRun}
                />

                <TerminalPanel
                    logs={logs}
                    running={running}
                    done={done}
                    exitOk={exitOk}
                    prompt={prompt}
                    promptInput={promptInput}
                    panelHeight={PANEL_H}
                    onPromptChange={setPromptInput}
                    onPromptSubmit={handlePromptSubmit}
                    onClear={() => { setLogs([]); setDone(false); setExitOk(false); }}
                />

            </div>
        </div>
    );
}