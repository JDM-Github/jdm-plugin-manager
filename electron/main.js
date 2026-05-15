const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require("fs");

let backendProcess = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;

function getCacheFilePath() {
    return path.join(app.getPath("userData"), "plugin_cache.json");
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
    } catch { /* silently fail */ }
}

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

ipcMain.handle("open-folder", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select working directory",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

function getBackendExe() {
    if (app.isPackaged) {
        const exe = process.platform === 'win32' ? 'flask_server.exe' : 'flask_server';
        return path.join(process.resourcesPath, 'backend', 'flask_server', exe);
    }
    const exe = process.platform === 'win32' ? 'flask_server.exe' : 'flask_server';
    return path.join(__dirname, '../backend/dist', 'flask_server', exe);
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

function waitForPort(port, timeout = 60_000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tryConnect = () => {
            const socket = new net.Socket();
            socket.setTimeout(300);
            socket
                .once('connect', () => { socket.destroy(); resolve(); })
                .once('error', () => {
                    socket.destroy();
                    if (Date.now() - start > timeout) {
                        reject(new Error(`Backend did not respond within ${timeout}ms`));
                    } else {
                        setTimeout(tryConnect, 250);
                    }
                })
                .once('timeout', () => { socket.destroy(); setTimeout(tryConnect, 250); })
                .connect(port, '127.0.0.1');
        };
        tryConnect();
    });
}

function killBackend() {
    if (!backendProcess) return;

    console.log('[Electron] Stopping backend...');
    const proc = backendProcess;
    const pid = proc.pid;
    backendProcess = null;

    if (process.platform === 'win32') {
        try {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            console.log('[Electron] Backend process tree killed via taskkill.');
        } catch (e) {
            console.error('[Electron] taskkill failed:', e.message);
        }
    } else {
        try {
            process.kill(-pid, 'SIGKILL');
        } catch {
            proc.kill('SIGKILL');
        }
    }
}

function startBackend(port) {
    const exePath = getBackendExe();
    console.log('[Backend] launching:', exePath);
    console.log(`[Backend] port: ${port}`);

    backendProcess = spawn(exePath, [], {
        stdio: 'pipe',
        windowsHide: true,
        detached: process.platform !== 'win32',
        env: { ...process.env, FLASK_PORT: String(port) },
    });

    backendProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trim()));
    backendProcess.stderr.on('data', (d) => console.error('[Backend ERR]', d.toString().trim()));
    backendProcess.on('exit', (code) => {
        console.log('[Backend] exited with code', code);
        if (!isQuitting) {
            isQuitting = true;
            dialog.showErrorBox('Backend crashed', `Flask server exited unexpectedly (code ${code}).`);
            app.quit();
        }
    });
}

function getTrayIcon() {
    if (app.isPackaged) {
        const icon = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
        return path.join(process.resourcesPath, icon);
    }
    const icon = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return path.join(__dirname, icon);
}

function buildTrayMenu() {
    return Menu.buildFromTemplate([
        {
            label: 'JDM Plugin Manager',
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Show Window',
            click() {
                mainWindow.show();
                mainWindow.focus();
            },
        },
        {
            label: 'Hide Window',
            click() {
                mainWindow.hide();
            },
        },
        { type: 'separator' },
        {
            label: 'Run on startup',
            type: 'checkbox',
            checked: app.getLoginItemSettings().openAtLogin,
            click(menuItem) {
                app.setLoginItemSettings({ openAtLogin: menuItem.checked });
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click() {
                isQuitting = true;
                app.quit();
            },
        },
    ]);
}

function createTray() {
    const icon = nativeImage.createFromPath(getTrayIcon());
    tray = new Tray(icon);
    tray.setToolTip('JDM Plugin Manager — running in background');
    tray.setContextMenu(buildTrayMenu());
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
        }
    });
    tray.on('double-click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

async function createWindow() {
    Menu.setApplicationMenu(null);
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 1000,
        minHeight: 650,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    mainWindow.show();

    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    createTray();

    const port = await getFreePort();
    startBackend(port);
    try {
        await waitForPort(port);
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (err) {
        dialog.showErrorBox('Backend failed to start', err.message);
        isQuitting = true;
        app.quit();
    }
}

app.on('before-quit', () => {
    isQuitting = true;
    killBackend();
});

app.on('window-all-closed', () => {
});

app.on('activate', () => {
    if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
    }
});

app.whenReady().then(createWindow);

process.on('uncaughtException', (err) => {
    console.error('[Electron] Uncaught Exception:', err);
    killBackend();
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Electron] Unhandled Rejection:', reason);
    killBackend();
    process.exit(1);
});