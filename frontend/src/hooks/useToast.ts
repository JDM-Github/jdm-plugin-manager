import { useState, useCallback } from "react";
import type { ToastState } from "../lib/types";

export function useToast() {
    const [toast, setToast] = useState<ToastState>(null);

    const showToast = useCallback((message: string, type: "success" | "neg") => {
        setToast({ message, type });
    }, []);

    const dismissToast = useCallback(() => {
        setToast(null);
    }, []);

    return { toast, showToast, dismissToast };
}