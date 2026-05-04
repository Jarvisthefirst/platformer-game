/**
 * electron-main.js — Electron Entry Point for Steam Platformer
 * 
 * Basic Electron main process with:
 *   - Frameless window (optional, for fullscreen)
 *   - Native resolution detection
 *   - Steam overlay support
 *   - Dev tools in development mode
 * 
 * Usage: electron .
 */

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// ── Configuration ──

const CONFIG = {
    /** Window title (shown in Steam overlay) */
    title: 'Steam Platformer',

    /** Fullscreen on launch (true for Steam Big Picture mode) */
    fullscreen: false,

    /** Use native resolution (true = display's native resolution) */
    nativeResolution: false,

    /** Custom resolution (used if nativeResolution is false) */
    width: 960,
    height: 540,

    /** Disable resizing (lock to fixed resolution) */
    resizable: true,

    /** Transparent window background */
    transparent: false,

    /** Show frame (set false for custom title bar) */
    frame: true,

    /** Enable dev tools (disable for production builds) */
    devTools: false,
};

// ── Window Creation ──

let mainWindow = null;

function createWindow() {
    const displays = screen.getPrimaryDisplay();

    let width = CONFIG.width;
    let height = CONFIG.height;

    if (CONFIG.nativeResolution) {
        width = displays.workAreaSize.width;
        height = displays.workAreaSize.height;
    }

    mainWindow = new BrowserWindow({
        width,
        height,
        title: CONFIG.title,
        fullscreen: CONFIG.fullscreen,
        resizable: CONFIG.resizable,
        transparent: CONFIG.transparent,
        frame: CONFIG.frame,
        backgroundColor: '#0a0a14',

        webPreferences: {
            // Security: disable node integration in renderer
            nodeIntegration: false,
            contextIsolation: true,

            // Enable WebGL and WebAudio
            webgl: true,
            webaudio: true,
        },

        // Game-friendly settings
        autoHideMenuBar: true,
        useContentSize: true,

        // Steam overlay support
        enableLargerThanScreen: true,
    });

    // Load the game
    const indexPath = path.join(__dirname, '..', 'index.html');
    mainWindow.loadFile(indexPath);

    // Dev tools (development only)
    if (CONFIG.devTools) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Handle close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle fullscreen toggle (F11)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            mainWindow.setFullscreen(!mainWindow.isFullscreen());
            event.preventDefault();
        }
    });
}

// ── App Lifecycle ──

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// ── Steam Integration Stubs ──
// These will be filled in when steamworks.js or greenworks is integrated.

/**
 * Initialize Steamworks API.
 * Called after app is ready and window is created.
 */
function initSteam() {
    // TODO: Initialize steamworks.js:
    // const steamworks = require('steamworks.js');
    // const client = steamworks.init(480); // Your App ID
    // console.log('Steam initialized:', client);
}

// ── Performance Recommendations ──

/*
 * For best performance on Steam Deck and low-end hardware:
 *
 * 1. VSync: Enable via GPU driver or handle in the render loop with
 *    requestAnimationFrame (already done in engine.js).
 *
 * 2. Resolution scaling: On Steam Deck, consider rendering at 640x360
 *    and letting the GPU scale to native 1280x800.
 *
 * 3. Power saving: Use app.commandLine.appendSwitch('disable-gpu-vsync')
 *    if you want to manage frame timing manually.
 *
 * 4. Steam Deck: Set your game to use the Deck's native 16:10 aspect ratio
 *    (1280x800) for full-screen rendering without black bars.
 */
