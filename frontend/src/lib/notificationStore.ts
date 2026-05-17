type NotifStatus = "success" | "error";

export interface Notification {
    id: string;
    tabLabel: string;
    namespace: string;
    tabId: string; 
    status: NotifStatus;
    timestamp: number;
}

type Listener = (notifs: Notification[]) => void;

let _notifs: Notification[] = [];
const _listeners = new Set<Listener>();

function notify() {
    _listeners.forEach(l => l([..._notifs]));
}

export function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

export const NotificationStore = {
    subscribe(l: Listener) {
        _listeners.add(l);
        l([..._notifs]);
        return () => { _listeners.delete(l); };
    },
    push(n: Omit<Notification, "id" | "timestamp">) {
        _notifs = [
            { ...n, id: crypto.randomUUID(), timestamp: Date.now() },
            ..._notifs,
        ].slice(0, 20);
        notify();
    },
    dismiss(id: string) {
        _notifs = _notifs.filter(n => n.id !== id);
        notify();
    },
    clear() {
        _notifs = [];
        notify();
    },
};