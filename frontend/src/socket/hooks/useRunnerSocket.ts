import { useCallback } from "react";
import { useSocket } from "../../lib/context/socket_context";
import { SocketEvents } from "../events";

interface RunCommandParams {
    namespace: string;
    command: string;
    args: Record<string, string | boolean>;
    cwd?: string;
}

export function useRunnerSocket() {
    const { emit, on, off } = useSocket();

    const runCommand = useCallback((params: RunCommandParams) => {
        emit(SocketEvents.RUN_COMMAND, params);
    }, [emit]);

    const sendAnswer = useCallback((answer: string) => {
        emit(SocketEvents.RUN_ANSWER, { answer });
    }, [emit]);

    const subscribeToEvents = useCallback((
        handlers: Record<string, (data: any) => void>
    ) => {
        Object.entries(handlers).forEach(([event, handler]) => {
            on(event, handler);
        });
    }, [on]);

    const unsubscribeFromEvents = useCallback((
        handlers: Record<string, (data: any) => void>
    ) => {
        Object.entries(handlers).forEach(([event, handler]) => {
            off(event, handler);
        });
    }, [off]);

    return { runCommand, sendAnswer, subscribeToEvents, unsubscribeFromEvents };
}