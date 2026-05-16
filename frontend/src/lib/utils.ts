import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { TabState } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createTab(index: number): TabState {
  return {
    id: crypto.randomUUID(),
    label: `Session ${index}`,
    workDir: "",
    activeCommand: null,
    fieldValues: {},
    running: false,
    logs: [],
    done: false,
    exitOk: false,
    prompt: null,
    promptInput: "",
  };
}