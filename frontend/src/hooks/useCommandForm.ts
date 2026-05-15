import { useState, useEffect, useCallback } from "react";
import type { Command } from "../lib/types";

interface UseCommandFormProps {
    activeCommand: Command | null;
}

export function useCommandForm({ activeCommand }: UseCommandFormProps) {
    const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});

    useEffect(() => {
        if (!activeCommand) return;
        const defaults: Record<string, string | boolean> = {};
        for (const f of activeCommand.fields) {
            if (f.default !== undefined) defaults[f.key] = f.default;
        }
        setFieldValues(defaults);
    }, [activeCommand]);

    const validate = useCallback((): string | null => {
        if (!activeCommand) return "No command selected";

        for (const f of activeCommand.fields) {
            if (f.required && !fieldValues[f.key]) {
                return `Required field missing: ${f.label}`;
            }
        }
        return null;
    }, [activeCommand, fieldValues]);

    const buildArgs = useCallback((): Record<string, string | boolean> => {
        if (!activeCommand) return {};
        const args: Record<string, string | boolean> = {};
        for (const f of activeCommand.fields) {
            const val = fieldValues[f.key];
            if (val === undefined || val === "" || val === false) continue;
            args[f.key] = val;
        }
        return args;
    }, [activeCommand, fieldValues]);

    const buildPreview = useCallback((namespace: string): string => {
        if (!activeCommand) return "";
        const parts = [`jdm-cli ${namespace} ${activeCommand.name}`];
        for (const f of activeCommand.fields) {
            const val = fieldValues[f.key];
            if (val === undefined || val === "" || val === false) continue;
            parts.push(f.type === "boolean" ? f.flag : `${f.flag} "${val}"`);
        }
        return parts.join(" ");
    }, [activeCommand, fieldValues]);

    const updateField = useCallback((key: string, value: string | boolean) => {
        setFieldValues(prev => ({ ...prev, [key]: value }));
    }, []);

    return {
        fieldValues,
        setFieldValues,
        validate,
        buildArgs,
        buildPreview,
        updateField,
    };
}