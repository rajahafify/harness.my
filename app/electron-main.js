// Phase 5: Desktop Shell + Auth (stub)
// Key Decision: Main process for native, renderer for viewer (SOLID: separation).
// In full: Use electron to wrap index.html, add menu, auth dialogs (BYOK), deep linking.
// TDD would test ipcMain handlers.

const { app, BrowserWindow } = require('electron');
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadFile('index.html'); // Load the viewer
  // Add auth, etc.
}
app.whenReady().then(createWindow);