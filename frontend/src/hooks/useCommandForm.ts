import { useCallback } from "react";
import type { Command, Field } from "../lib/types";

interface UseCommandFormProps {
    activeCommand: Command | null;
    fieldValues: Record<string, string | boolean>;
}

export function useCommandForm({ activeCommand, fieldValues }: UseCommandFormProps) {

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

    const getSwitchTargets = useCallback((): Set<string> => {
        if (!activeCommand) return new Set();
        return new Set(
            activeCommand.fields
                .filter(f => f.radio && f.class === "switch_button" && f.class_target)
                .map(f => f.class_target!)
        );
    }, [activeCommand]);

    const isFieldActive = useCallback((
        field: Field,
        activeSwitchTarget: string | null,
        disabledClasses: Set<string>,
        switchTargets: Set<string>
    ): boolean => {
        if (field.radio) return false;
        if (field.class) {
            if (disabledClasses.has(field.class)) return false;
            if (switchTargets.has(field.class)) return field.class === activeSwitchTarget;
        }
        return true;
    }, []);

    const validate = useCallback((): string | null => {
        if (!activeCommand) return "No command selected";
        for (const f of activeCommand.fields) {
            if (f.required && !fieldValues[f.key])
                return `Required field missing: ${f.label}`;
        }
        return null;
    }, [activeCommand, fieldValues]);

    const buildArgs = useCallback((): Record<string, string | boolean> => {
        if (!activeCommand) return {};
        const activeSwitchTarget = getActiveSwitchTarget(fieldValues);
        const disabledClasses = getDisabledClasses(fieldValues);
        const switchTargets = getSwitchTargets();
        const args: Record<string, string | boolean> = {};

        if (activeSwitchTarget !== null) args["switch_button"] = activeSwitchTarget;

        for (const f of activeCommand.fields) {
            if (!isFieldActive(f, activeSwitchTarget, disabledClasses, switchTargets)) continue;
            if (!f.flag) continue;

            const val = fieldValues[f.key];
            if (val === undefined || val === "" || val === false) continue;
            const flagKey = f.flag.replace(/^--/, "");
            args[flagKey] = val;
        }

        return args;
    }, [activeCommand, fieldValues, getActiveSwitchTarget, getDisabledClasses, getSwitchTargets, isFieldActive]);

    const buildPreview = useCallback((namespace: string): string => {
        if (!activeCommand) return "";
        const activeSwitchTarget = getActiveSwitchTarget(fieldValues);
        const disabledClasses = getDisabledClasses(fieldValues);
        const switchTargets = getSwitchTargets();
        const parts = [`jdm-cli ${namespace} ${activeCommand.name}`];

        if (activeSwitchTarget !== null) parts.push(`--switch_button="${activeSwitchTarget}"`);

        for (const f of activeCommand.fields) {
            if (!isFieldActive(f, activeSwitchTarget, disabledClasses, switchTargets)) continue;
            const val = fieldValues[f.key];
            if (val === undefined || val === "" || val === false || !f.flag) continue;
            parts.push(f.type === "boolean" ? f.flag : `${f.flag} "${val}"`);
        }
        return parts.join(" ");
    }, [activeCommand, fieldValues, getActiveSwitchTarget, getDisabledClasses, getSwitchTargets, isFieldActive]);

    return { validate, buildArgs, buildPreview };
}