import { SocketEvents } from "../events";

export type RunnerCallbacks = {
    onLine: (tabId: string, text: string) => void;
    onDone: (tabId: string, success: boolean, code: number) => void;
    onError: (tabId: string, text: string) => void;
    onPrompt: (tabId: string, text: string) => void;
};

export const createRunnerHandlers = (callbacks: RunnerCallbacks) => ({
    [SocketEvents.RUN_LINE]: (data: { tab_id: string; text: string }) =>
        callbacks.onLine(data.tab_id, data.text),

    [SocketEvents.RUN_DONE]: (data: { tab_id: string; code: number; success: boolean }) =>
        callbacks.onDone(data.tab_id, data.success, data.code),

    [SocketEvents.RUN_ERROR]: (data: { tab_id: string; text: string }) =>
        callbacks.onError(data.tab_id, data.text),

    [SocketEvents.RUN_PROMPT]: (data: { tab_id: string; text: string }) =>
        callbacks.onPrompt(data.tab_id, data.text),
});