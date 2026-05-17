/// <reference types="vite/client" />
declare global {
    interface Window {
        electronAPI?: {
            openFolder: () => Promise<string | null>;
            cache: {
                get: (key: string) => Promise<any>;
                set: (key: string, value: any) => Promise<void>;
                delete: (key: string) => Promise<void>;
            };
        };
    }
}
export { };