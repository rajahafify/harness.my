const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harnessAPI', {
  // Bridge for cards to request agent actions
  requestFollowUp: (prompt) => ipcRenderer.invoke('agent-generate-html', prompt),

  // Settings for real AI provider (OpenAI-compatible or Grok CLI auto)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
});
