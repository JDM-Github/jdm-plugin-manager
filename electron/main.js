// ======================== CONFIGURATION (edit these) ========================
const CONFIG = {
    // Window appearance
    window: {
        width: 1280,
        height: 820,
        minWidth: 1000,
        minHeight: 650,
    },
    // Backend executable (without extension – code adds .exe on Windows)
    backendExeName: "flask_server",
    // Tray icon file names (place these inside resources/ folder)
    trayIconWin: "icon.ico",
    trayIconOther: "icon.png",
    // Loading HTML file (relative to __dirname)
    loadingHtml: "loading.html",
    // Preload script (relative to __dirname)
    preloadScript: "preload.js",
    // Cache file name (stored in app.getPath("userData"))
    cacheFileName: "plugin_cache.json",
    // Timeout (ms) for waiting backend port
    backendPortTimeoutMs: 60000,
    // App name for tray / login items
    appName: "JDM Plugin Manager",
};
// ============================================================================

const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage } = require("electron");
const { spawn, execSync } = require("child_process");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const net = require("net");
const fs = require("fs");

// ---------- global references ----------
let backendProcess = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;

// ======================== CACHE HELPERS ========================
function getCacheFilePath() {
    return path.join(app.getPath("userData"), CONFIG.cacheFileName);
}

function readCacheFile() {
    try {
        const raw = fs.readFileSync(getCacheFilePath(), "utf-8");
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function writeCacheFile(data) {
    try {
        fs.writeFileSync(getCacheFilePath(), JSON.stringify(data), "utf-8");
    } catch {
        // silently fail
    }
}

// ======================== BACKEND MANAGEMENT ========================
function getBackendExe() {
    const exeName = process.platform === "win32"
        ? `${CONFIG.backendExeName}.exe`
        : CONFIG.backendExeName;

    if (app.isPackaged) {
        return path.join(process.resourcesPath, "backend", "flask_server", exeName);
    }
    return path.join(__dirname, "../backend/dist", "flask_server", exeName);
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, "127.0.0.1", () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on("error", reject);
    });
}

function waitForPort(port, timeout = CONFIG.backendPortTimeoutMs) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tryConnect = () => {
            const socket = new net.Socket();
            socket.setTimeout(300);
            socket
                .once("connect", () => { socket.destroy(); resolve(); })
                .once("error", () => {
                    socket.destroy();
                    if (Date.now() - start > timeout) {
                        reject(new Error(`Backend did not respond within ${timeout}ms`));
                    } else {
                        setTimeout(tryConnect, 250);
                    }
                })
                .once("timeout", () => { socket.destroy(); setTimeout(tryConnect, 250); })
                .connect(port, "127.0.0.1");
        };
        tryConnect();
    });
}

function killBackend() {
    if (!backendProcess) return;

    console.log("[Electron] Stopping backend...");
    const proc = backendProcess;
    const pid = proc.pid;
    backendProcess = null;

    if (process.platform === "win32") {
        try {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
            console.log("[Electron] Backend process tree killed via taskkill.");
        } catch (e) {
            console.error("[Electron] taskkill failed:", e.message);
        }
    } else {
        try {
            process.kill(-pid, "SIGKILL");
        } catch {
            proc.kill("SIGKILL");
        }
    }
}

function startBackend(port) {
    const exePath = getBackendExe();
    console.log("[Backend] launching:", exePath);
    console.log(`[Backend] port: ${port}`);

    backendProcess = spawn(exePath, [], {
        stdio: "pipe",
        windowsHide: true,
        detached: process.platform !== "win32",
        env: { ...process.env, FLASK_PORT: String(port) },
    });

    backendProcess.stdout.on("data", (d) => console.log("[Backend]", d.toString().trim()));
    backendProcess.stderr.on("data", (d) => console.error("[Backend ERR]", d.toString().trim()));
    backendProcess.on("exit", (code) => {
        console.log("[Backend] exited with code", code);
        if (!isQuitting) {
            isQuitting = true;
            dialog.showErrorBox("Backend crashed", `Flask server exited unexpectedly (code ${code}).`);
            app.quit();
        }
    });
}

// ======================== TRAY ========================
function getTrayIcon() {
    const iconFile = process.platform === "win32"
        ? CONFIG.trayIconWin
        : CONFIG.trayIconOther;

    if (app.isPackaged) {
        // Icons are copied to process.resourcesPath root via extraResources
        return path.join(process.resourcesPath, iconFile);
    }
    // In dev, icons live inside resources/
    return path.join(__dirname, "resources", iconFile);
}

function buildTrayMenu() {
    return Menu.buildFromTemplate([
        { label: CONFIG.appName, enabled: false },
        { type: "separator" },
        {
            label: "Show Window",
            click() {
                mainWindow.show();
                mainWindow.focus();
            },
        },
        {
            label: "Hide Window",
            click() {
                mainWindow.hide();
            },
        },
        { type: "separator" },
        {
            label: "Run on startup",
            type: "checkbox",
            checked: app.getLoginItemSettings().openAtLogin,
            click(menuItem) {
                app.setLoginItemSettings({ openAtLogin: menuItem.checked });
            },
        },
        { type: "separator" },
        {
            label: "Quit",
            click() {
                isQuitting = true;
                app.quit();
            },
        },
    ]);
}

function createTray() {
    const iconPath = getTrayIcon();
    console.log("[Tray] loading icon from:", iconPath);
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    tray.setToolTip(`${CONFIG.appName} — running in background`);
    tray.setContextMenu(buildTrayMenu());
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
        }
    });
    tray.on("double-click", () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

// ======================== IPC HANDLERS (modularized) ========================
function registerIpcHandlers() {
    // Cache handlers
    ipcMain.handle("cache:get", (_event, key) => {
        const store = readCacheFile();
        return store[key] ?? null;
    });

    ipcMain.handle("cache:set", (_event, key, value) => {
        const store = readCacheFile();
        store[key] = value;
        writeCacheFile(store);
    });

    ipcMain.handle("cache:delete", (_event, key) => {
        const store = readCacheFile();
        delete store[key];
        writeCacheFile(store);
    });

    // Folder picker
    ipcMain.handle("open-folder", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory"],
            title: "Select working directory",
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });
}

// ======================== AUTO UPDATER ========================
function initAutoUpdater() {
    if (!app.isPackaged) return;
    autoUpdater.checkForUpdates();
    autoUpdater.on("update-available", (info) => {
        console.log(`[AutoUpdater] Update available: v${info.version}`);
        dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update Available",
            message: `Version ${info.version} is downloading in the background.\nYou'll be notified when it's ready to install.`,
            buttons: ["OK"],
        });
    });
    autoUpdater.on("update-not-available", () => {
        console.log("[AutoUpdater] App is up to date.");
    });
    autoUpdater.on("update-downloaded", (info) => {
        console.log(`[AutoUpdater] Update downloaded: v${info.version}`);
        dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update Ready",
            message: `Version ${info.version} has been downloaded.\nThe app will restart to apply the update.`,
            buttons: ["Restart Now", "Later"],
            defaultId: 0,
            cancelId: 1,
        }).then(({ response }) => {
            if (response === 0) {
                isQuitting = true;
                autoUpdater.quitAndInstall();
            }
        });
    });
    autoUpdater.on("error", (err) => {
        console.error("[AutoUpdater] Error:", err.message);
    });
}

// ======================== WINDOW CREATION ========================
async function createWindow() {
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: CONFIG.window.width,
        height: CONFIG.window.height,
        minWidth: CONFIG.window.minWidth,
        minHeight: CONFIG.window.minHeight,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, CONFIG.preloadScript),
        },
    });

    // Show loading HTML immediately
    mainWindow.loadFile(path.join(__dirname, CONFIG.loadingHtml));
    mainWindow.show();

    mainWindow.on("close", (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    createTray();
    initAutoUpdater();

    // Start backend and connect
    const port = await getFreePort();
    startBackend(port);
    try {
        await waitForPort(port);
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (err) {
        dialog.showErrorBox("Backend failed to start", err.message);
        isQuitting = true;
        app.quit();
    }
}

// ======================== APP LIFECYCLE ========================
app.on("before-quit", () => {
    isQuitting = true;
    killBackend();
});

app.on("window-all-closed", () => {
    // Do nothing – keep the app alive in tray
});

app.on("activate", () => {
    if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
    }
});

app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
});

// Global error handlers
process.on("uncaughtException", (err) => {
    console.error("[Electron] Uncaught Exception:", err);
    killBackend();
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    console.error("[Electron] Unhandled Rejection:", reason);
    killBackend();
    process.exit(1);
});