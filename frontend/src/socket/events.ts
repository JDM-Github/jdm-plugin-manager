export const SocketEvents = {
    // Client -> Server
    RUN_COMMAND: "run_command",
    RUN_ANSWER: "run_answer",

    // Server -> Client
    RUN_LINE: "run_line",
    RUN_DONE: "run_done",
    RUN_ERROR: "run_error",
    RUN_PROMPT: "run_prompt",

    RECONNECT_TABS: "reconnect_tabs",
    RUN_RESUME: "run_resume",
    RUN_REPLAY: "run_replay",
    RUN_CLEAR: "run_clear",

    RUN_KILL: "run_kill",
} as const;
