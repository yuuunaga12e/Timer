import { app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
process.env.DIST = join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST, "../public");
let win;
const preload = join(__dirname$1, "./preload.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");
async function createWindow() {
  win = new BrowserWindow({
    title: "Focus Timer",
    icon: join(process.env.VITE_PUBLIC || "", "favicon.ico"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      nodeIntegration: true,
      contextIsolation: false
    },
    width: 600,
    height: 600,
    resizable: true,
    autoHideMenuBar: true
  });
  win.setMinimumSize(400, 500);
  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(url);
  } else {
    await win.loadFile(indexHtml);
  }
}
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
      win = null;
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
