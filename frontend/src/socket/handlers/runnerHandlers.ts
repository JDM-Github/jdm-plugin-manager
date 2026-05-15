import { SocketEvents } from "../events";

export type RunnerCallbacks = {
    onLine: (text: string) => void;
    onDone: (success: boolean, code: number) => void;
    onError: (text: string) => void;
    onPrompt: (text: string) => void;
};

export const createRunnerHandlers = (callbacks: RunnerCallbacks) => ({
    [SocketEvents.RUN_LINE]: (data: { text: string }) => {
        callbacks.onLine(data.text);
    },
    [SocketEvents.RUN_DONE]: (data: { code: number; success: boolean }) => {
        callbacks.onDone(data.success, data.code);
    },
    [SocketEvents.RUN_ERROR]: (data: { text: string }) => {
        callbacks.onError(data.text);
    },
    [SocketEvents.RUN_PROMPT]: (data: { text: string }) => {
        callbacks.onPrompt(data.text);
    },
});