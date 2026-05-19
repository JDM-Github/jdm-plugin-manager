const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    openFolder: () => ipcRenderer.invoke("open-folder"),
    cache: {
        get: (key) => ipcRenderer.invoke("cache:get", key),
        set: (key, value) => ipcRenderer.invoke("cache:set", key, value),
        delete: (key) => ipcRenderer.invoke("cache:delete", key),
    },
});