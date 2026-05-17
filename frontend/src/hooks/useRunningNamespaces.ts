import { useEffect, useState } from "react";

const _running = new Set<string>();
type Listener = (s: Set<string>) => void;
const _listeners = new Set<Listener>();

function broadcast() {
    const snap = new Set(_running);
    _listeners.forEach(l => l(snap));
}

export function markRunning(namespace: string) {
    _running.add(namespace);
    broadcast();
}

export function unmarkRunning(namespace: string) {
    _running.delete(namespace);
    broadcast();
}

export function useRunningNamespaces(): Set<string> {
    const [running, setRunning] = useState<Set<string>>(new Set(_running));
    useEffect(() => {
        _listeners.add(setRunning);
        return () => { _listeners.delete(setRunning); };
    }, []);
    return running;
}