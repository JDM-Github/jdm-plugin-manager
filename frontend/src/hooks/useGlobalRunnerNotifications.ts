import { useEffect } from "react";
import SocketHandler from "../lib/utilities/socket_handler";
import { NotificationStore } from "../lib/notificationStore";
import { SocketEvents } from "../socket/events";
import { getRunningTab, deleteRunningTab } from "../lib/pendingNotifications";
import { unmarkRunning } from "./useRunningNamespaces";

let _initialized = false;

export function useGlobalRunnerNotifications() {
    useEffect(() => {
        if (_initialized) return;
        _initialized = true;

        const onDone = async (data: { tab_id: string; success: boolean }) => {
            const meta = await getRunningTab(data.tab_id);
            if (!meta) return;

            unmarkRunning(meta.namespace);
            await deleteRunningTab(data.tab_id);
            const onPage = window.location.pathname.startsWith(`/plugin-runner/${meta.namespace}`);
            if (onPage) return;

            NotificationStore.push({
                tabLabel: meta.label,
                namespace: meta.namespace,
                tabId: data.tab_id,
                status: data.success ? "success" : "error",
            });
        };

        const onError = async (data: { tab_id: string }) => {
            const meta = await getRunningTab(data.tab_id);
            if (!meta) return;

            unmarkRunning(meta.namespace);
            await deleteRunningTab(data.tab_id);

            const onPage = window.location.pathname === `/plugin-runner/${meta.namespace}`;
            if (onPage) return;

            NotificationStore.push({
                tabLabel: meta.label,
                namespace: meta.namespace,
                tabId: data.tab_id,
                status: "error",
            });
        };

        SocketHandler.on(SocketEvents.RUN_DONE, onDone);
        SocketHandler.on(SocketEvents.RUN_ERROR, onError);
    }, []);
}