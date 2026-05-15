import { pathToFileURL } from "url";
import path from "path";
import readline from "readline";

const [, , pluginEntry, command, ...rawArgs] = process.argv;

// ── Chalk proxy (unchanged) ───────────────────────────────────
function makeChalk() {
    const fn = (s) => String(s ?? "");
    return new Proxy(fn, {
        get(_, k) {
            if (k === "level") return 3;
            if (k === "visible") return true;
            return makeChalk();
        },
        apply(_, __, [s]) { return String(s ?? ""); },
    });
}
const chalk = makeChalk();

// ── Args parsing (unchanged) ──────────────────────────────────
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = rawArgs[i + 1];
    if (next !== undefined && !next.startsWith("--")) { args[key] = next; i++; }
    else args[key] = true;
}
const argsArray = [];
for (const [key, value] of Object.entries(args)) {
    if (value === true) argsArray.push(`--${key}`);
    else if (value !== false && value !== "") argsArray.push(`--${key}`, String(value));
}

// ── Stdin reader — answers come in one line at a time ─────────
const stdinRl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const _pendingCallbacks = [];
stdinRl.on("line", (line) => {
    const cb = _pendingCallbacks.shift();
    if (cb) cb(line.trim());
});

// ── rl stub — writes sentinel, queues callback ────────────────
// Sentinel format:  __PROMPT__:<question text>
// Backend detects this prefix and forwards to the frontend.
const rl = {
    question(prompt, callback) {
        const clean = prompt.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").trim();
        process.stdout.write(`__PROMPT__:${clean}\n`);
        _pendingCallbacks.push(callback);
    },
    close() { },
    pause() { },
    resume() { },
};

// ── Run ───────────────────────────────────────────────────────
try {
    const plugin = await import(pathToFileURL(path.resolve(pluginEntry)).href);
    if (typeof plugin.run !== "function") {
        process.stderr.write(`ERROR: plugin does not export run()\n`);
        process.exit(1);
    }
    try {
        await plugin.run(command, argsArray, chalk, rl);
    } catch (err) {
        process.stderr.write(`\nERROR: ${err.message}\n${err.stack ?? ""}\n`);
        process.exit(1);
    } finally {
        stdinRl.close();
        process.stdin.destroy();
    }
} catch (err) {
    process.stderr.write(`\nERROR: ${err.message}\n${err.stack ?? ""}\n`);
    process.exit(1);
}
