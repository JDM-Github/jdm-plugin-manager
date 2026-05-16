import { useState, useEffect, useCallback } from "react";
import type { Command, Field } from "../lib/types";

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

    // ── Active switch_button class_target ─────────────────────
    // e.g. "blueprint" | "socket" | null
    const getActiveSwitchTarget = useCallback(
        (values: Record<string, string | boolean>): string | null => {
            if (!activeCommand) return null;
            return (
                activeCommand.fields.find(
                    f => f.radio && f.class === "switch_button" && values[f.key] === true
                )?.class_target ?? null
            );
        },
        [activeCommand]
    );

    // ── All classes currently disabled via disable_when_active ─
    // e.g. if --full is true → disabledClasses = Set { "manual" }
    const getDisabledClasses = useCallback(
        (values: Record<string, string | boolean>): Set<string> => {
            if (!activeCommand) return new Set();
            return new Set(
                activeCommand.fields
                    .filter(f => f.disable_when_active && values[f.key] === true)
                    .map(f => f.disable_when_active!)
            );
        },
        [activeCommand]
    );

    // ── All classes that are radio switch_button targets ───────
    // e.g. Set { "blueprint", "socket" }
    const getSwitchTargets = useCallback((): Set<string> => {
        if (!activeCommand) return new Set();
        return new Set(
            activeCommand.fields
                .filter(f => f.radio && f.class === "switch_button" && f.class_target)
                .map(f => f.class_target!)
        );
    }, [activeCommand]);

    // ── Should this field appear in args / preview? ────────────
    const isFieldActive = useCallback(
        (
            field: Field,
            activeSwitchTarget: string | null,
            disabledClasses: Set<string>,
            switchTargets: Set<string>
        ): boolean => {
            if (field.radio) return false;                          // radio rows handled separately

            if (field.class) {
                if (disabledClasses.has(field.class)) return false; // disabled by e.g. --full
                if (switchTargets.has(field.class))                 // radio-gated class
                    return field.class === activeSwitchTarget;
            }

            return true;
        },
        []
    );

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

        const activeSwitchTarget = getActiveSwitchTarget(fieldValues);
        const disabledClasses = getDisabledClasses(fieldValues);
        const switchTargets = getSwitchTargets();
        const args: Record<string, string | boolean> = {};

        // 1. Emit --switch_button="<target>" once if a radio is active
        if (activeSwitchTarget !== null) {
            args["switch_button"] = activeSwitchTarget;
        }

        // 2. Emit regular / class-gated / disable-gated fields
        for (const f of activeCommand.fields) {
            if (!isFieldActive(f, activeSwitchTarget, disabledClasses, switchTargets)) continue;

            const val = fieldValues[f.key];
            if (val === undefined || val === "" || val === false) continue;
            args[f.key] = val;
        }

        return args;
    }, [activeCommand, fieldValues, getActiveSwitchTarget, getDisabledClasses, getSwitchTargets, isFieldActive]);

    const buildPreview = useCallback((namespace: string): string => {
        if (!activeCommand) return "";

        const activeSwitchTarget = getActiveSwitchTarget(fieldValues);
        const disabledClasses = getDisabledClasses(fieldValues);
        const switchTargets = getSwitchTargets();
        const parts = [`jdm-cli ${namespace} ${activeCommand.name}`];

        // 1. switch_button arg
        if (activeSwitchTarget !== null) {
            parts.push(`--switch_button="${activeSwitchTarget}"`);
        }

        // 2. Regular / class-gated / disable-gated fields
        for (const f of activeCommand.fields) {
            if (!isFieldActive(f, activeSwitchTarget, disabledClasses, switchTargets)) continue;

            const val = fieldValues[f.key];
            if (val === undefined || val === "" || val === false) continue;
            if (!f.flag) continue;
            parts.push(f.type === "boolean" ? f.flag : `${f.flag} "${val}"`);
        }

        return parts.join(" ");
    }, [activeCommand, fieldValues, getActiveSwitchTarget, getDisabledClasses, getSwitchTargets, isFieldActive]);

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