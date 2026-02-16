import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─ dist
// │ ├── index.html
// │ ├── ...
// │ └─┬─ main
// │   ├── main.js
// │   └── ...

process.env.DIST = join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST, '../public')

let win: BrowserWindow | null

const preload = join(__dirname, './preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
    win = new BrowserWindow({
        title: 'Focus Timer',
        icon: join(process.env.VITE_PUBLIC, 'favicon.ico'),
        webPreferences: {
            preload,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            // Consider using contextBridge.exposeInMainWorld
            nodeIntegration: true,
            contextIsolation: false,
        },
        width: 600,
        height: 600,
        resizable: true,
        autoHideMenuBar: true,
    })

    // Set minimum size
    win.setMinimumSize(400, 500)

    if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-plugin injects this
        // Load the url of the dev server if in development mode
        await win.loadURL(url)
        // Open the DevTools.
        // win.webContents.openDevTools()
    } else {
        // Load the index.html of the app.
        await win.loadFile(indexHtml)
    }
}

// Check if trying to run a second instance, if so, quit.
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
    process.exit(0)
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Focus the running window if user tries to open another instance
        if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
    })

    // Create window, load the rest of the app, etc...
    app.whenReady().then(createWindow)

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
            win = null
        }
    })

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
}
