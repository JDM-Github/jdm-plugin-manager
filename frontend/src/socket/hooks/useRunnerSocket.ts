import { useCallback } from "react";
import { useSocket } from "../../lib/context/socket_context";
import { SocketEvents } from "../events";

interface RunCommandParams {
    tabId: string;
    namespace: string;
    command: string;
    args: Record<string, string | boolean>;
    cwd?: string;
}

export function useRunnerSocket() {
    const { emit, on, off } = useSocket();

    const runCommand = useCallback((params: RunCommandParams) => {
        emit(SocketEvents.RUN_COMMAND, {
            tab_id: params.tabId,
            namespace: params.namespace,
            command: params.command,
            args: params.args,
            cwd: params.cwd,
        });
    }, [emit]);

    const sendAnswer = useCallback((tabId: string, answer: string) => {
        emit(SocketEvents.RUN_ANSWER, { tab_id: tabId, answer });
    }, [emit]);

    const subscribeToEvents = useCallback((
        handlers: Record<string, (data: any) => void>
    ) => {
        Object.entries(handlers).forEach(([event, handler]) => on(event, handler));
    }, [on]);

    const unsubscribeFromEvents = useCallback((
        handlers: Record<string, (data: any) => void>
    ) => {
        Object.entries(handlers).forEach(([event, handler]) => off(event, handler));
    }, [off]);

    return { runCommand, sendAnswer, subscribeToEvents, unsubscribeFromEvents, emit };
}