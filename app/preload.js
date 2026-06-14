const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harnessAPI', {
  // Bridge for cards to request agent actions
  requestFollowUp: (prompt) => ipcRenderer.invoke('agent-generate-html', prompt),
  // Future: more APIs for sessions, etc.
});
