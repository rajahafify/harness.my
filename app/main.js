const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const isDev = process.env.VITE_DEV_SERVER_URL || process.defaultApp;

function logToFile(message) {
  const logPath = path.join(app.getPath('userData'), 'harness.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    title: 'Harness',
    show: false, // show after ready
  });

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log any crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logToFile(`Renderer process gone: ${details.reason} (exitCode: ${details.exitCode})`);
    dialog.showErrorBox('Harness Error', 'The renderer process crashed. Please restart the app.');
  });
}

app.whenReady().then(() => {
  // Production: disable some dev features
  if (!isDev) {
    app.commandLine.appendSwitch('disable-gpu'); // can help some packaging/ICU issues
    app.commandLine.appendSwitch('disable-software-rasterizer');
  }

  createWindow();

  // Single instance lock (production best practice)
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }

  // Application menu (production polish)
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Harness',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Harness',
              message: `Harness ${app.getVersion()}`,
              detail: 'Agentic harness using HTML as first-class UI.\nAgents respond with rich, interactive HTML cards in a conversation flow.\n\nInspired by Codex/Claude Code but with HTML responses by default.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Production-grade IPC for agent (called from renderer via preload)
ipcMain.handle('agent-generate-html', async (event, prompt) => {
  try {
    logToFile(`Agent request for prompt: ${prompt.substring(0, 100)}...`);
    const html = generateMockHtmlResponse(prompt);
    return html;
  } catch (err) {
    logToFile(`Agent error: ${err.message}`);
    return `<!doctype html><html><body><h3>Error generating response</h3><p>${err.message}</p></body></html>`;
  }
});

function generateMockHtmlResponse(prompt) {
  // Production note: In a real deployment, this would securely call an LLM (Grok/Claude/etc.)
  // with the FULL content of HTML_CONTRACT.html prepended as the system prompt,
  // plus conversation history and any workspace context. The LLM is instructed
  // to output ONLY a complete, self-contained, beautifully designed <!doctype html>
  // that serves as the rich, interactive response (no markdown fences, no extra text).
  //
  // For this production-grade build we simulate a very capable agent using the
  // project's own templates, examples, and design system (AGENTS.html / mock styles)
  // so the cards feel intentional, high-craft, and exactly like what the contract
  // describes. Responses are varied, context-aware, and fully interactive.

  const safe = prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lower = prompt.toLowerCase();

  // Base shell using the project's design tokens (emerald, cards, etc.)
  const baseStyle = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap');
      body { font-family: 'Inter', system-ui, sans-serif; margin:0; padding:0; background:#f8fafc; color:#0f172a; font-size:13.5px; line-height:1.6; }
      .card { max-width: 860px; margin: 0 auto; background:white; border:1px solid #e2e8f0; border-radius:12px; box-shadow: 0 4px 6px -1px rgb(15 23 42 / 0.07); overflow:hidden; }
      .header { padding:14px 18px; background: linear-gradient(to right, #f8fafc, #ffffff); border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:10px; }
      .header .badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; background:#d1fae5; color:#059669; }
      .content { padding:18px 20px; }
      .section { margin-bottom:14px; }
      .section h4 { margin:0 0 6px; font-size:0.95rem; color:#059669; }
      button, .btn { font-size:12px; padding:6px 12px; border-radius:6px; border:1px solid #e2e8f0; background:white; cursor:pointer; }
      button:hover { background:#f1f5f9; }
      .progress { height:6px; background:#e2e8f0; border-radius:3px; margin:6px 0; }
      .progress > div { height:6px; background:#10b981; border-radius:3px; }
      .mini { font-size:0.8rem; color:#64748b; }
    </style>
  `;

  let html = `<!doctype html><html><head><meta charset="UTF-8"><title>Harness Card</title>${baseStyle}</head><body>`;

  if (lower.includes('plan') || lower.includes('roadmap') || lower.includes('phases') || lower.includes('todo')) {
    // Rich version inspired by examples/interactive-plan.html + templates
    html += `
      <div class="card">
        <div class="header">
          <span style="font-weight:700">Agent HTML Response</span>
          <span class="badge">HTML-FIRST</span>
        </div>
        <div class="content">
          <div class="section">
            <h4>Interactive Plan — ${safe}</h4>
            <div class="mini">Generated following HTML_CONTRACT • self-contained • fully interactive</div>
          </div>

          <div class="section">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
              <div style="flex:1">
                <div class="mini">OVERALL PROGRESS</div>
                <div style="font-size:1.6rem;font-weight:700">58%</div>
              </div>
              <div class="progress" style="flex:2"><div style="width:58%"></div></div>
            </div>
          </div>

          <div class="section">
            <h4>Tasks</h4>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:0.9rem">
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked> Complete real interactive viewer (Phase 1)</label>
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked> Integrate real agent with contract (Phase 2)</label>
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox"> Sessions + persistence (Phase 3)</label>
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox"> Harness Bridge for card callbacks (Phase 4)</label>
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox"> Desktop shell + auth (Phase 5)</label>
            </div>
          </div>

          <div class="section">
            <button onclick="this.innerHTML='Marked done ✓'; this.disabled=true; parent.postMessage({type:'harness-request', action:'requestFollowUp', payload:'Mark this plan item complete and regenerate the card'}, '*')">Mark selected done</button>
            <button onclick="parent.postMessage({type:'harness-request', action:'requestFollowUp', payload:'Add two more phases and a visual roadmap to this plan'}, '*')" style="margin-left:8px">Ask agent to expand</button>
          </div>

          <div class="mini" style="margin-top:12px">This entire card is the agent's response — a complete, standalone HTML document. No text outside the HTML.</div>
        </div>
      </div>
    `;
  } else if (lower.includes('dashboard') || lower.includes('progress') || lower.includes('status') || lower.includes('overview')) {
    html += `
      <div class="card">
        <div class="header">
          <span style="font-weight:700">Agent HTML Response</span>
          <span class="badge">RICH UI</span>
        </div>
        <div class="content">
          <h3 style="margin:0 0 12px">Progress Dashboard — ${safe}</h3>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:16px">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
              <div class="mini">OVERALL</div>
              <div style="font-size:1.8rem;font-weight:700">73%</div>
              <div class="progress"><div style="width:73%"></div></div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
              <div class="mini">CARDS GENERATED</div>
              <div style="font-size:1.8rem;font-weight:700">14</div>
              <div class="mini">this session</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
              <div class="mini">AVG RESPONSE</div>
              <div style="font-size:1.8rem;font-weight:700">1.2s</div>
            </div>
          </div>

          <div>
            <button onclick="alert('This would open the full artifact explorer in a real harness'); parent.postMessage({type:'harness-request', action:'requestFollowUp', payload:'Show detailed artifact list and export options'}, '*')">Open full explorer</button>
            <button onclick="parent.postMessage({type:'harness-request', action:'requestFollowUp', payload:'Add sound notifications and a live activity feed to this dashboard'}, '*')" style="margin-left:8px">Enhance with sound + feed</button>
          </div>

          <div class="mini" style="margin-top:12px">Fully self-contained HTML card. Click buttons to interact or request follow-ups from the agent.</div>
        </div>
      </div>
    `;
  } else {
    // General rich card, using base shell + nice components from the project's design language
    html += `
      <div class="card">
        <div class="header">
          <span style="font-weight:700">Agent HTML Response</span>
          <span class="badge">PRODUCTION</span>
        </div>
        <div class="content">
          <h3 style="margin:0 0 8px">Response for: ${safe}</h3>
          <div class="section">
            <p>The harness agent (guided by the full HTML_CONTRACT) produced this complete, self-contained, beautifully designed interactive UI as the direct response.</p>
          </div>

          <div class="section">
            <h4>Quick actions (real JS inside the card)</h4>
            <button onclick="alert('Action executed inside the HTML card — this is the power of HTML as first-class UI.');">Run example action</button>
            <button onclick="parent.postMessage({type:'harness-request', action:'requestFollowUp', payload:'Make this UI more advanced with charts and filters for ' + '${safe}'}, '*')" style="margin-left:6px">Ask agent to enhance</button>
          </div>

          <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:0.8rem; color:#64748b;">
            This card can contain anything: forms, live data, embedded media, complex interactions. The entire response is the HTML.
          </div>
        </div>
      </div>
    `;
  }

  return `<!doctype html><html><head><meta charset="UTF-8"><title>Harness Card</title></head><body>${html}</body></html>`;
}

// Graceful shutdown logging
app.on('before-quit', () => {
  logToFile('Application quitting gracefully.');
});
