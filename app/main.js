const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
const isDev = process.env.VITE_DEV_SERVER_URL || process.defaultApp;

// Simple settings store (production: could use electron-store)
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      return s;
    }
  } catch (e) {}
  // Production default: auto-use real Grok if CLI login token is present on this machine
  if (getGrokCliToken()) {
    return { provider: 'grok-cli' };
  }
  return { provider: 'grok' }; // will require user to enter key in Settings or run grok login
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
  } catch (e) {
    logToFile('Failed to save settings: ' + e.message);
  }
}

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
// ALWAYS attempts real Grok (CLI auto-detect or configured key). Only returns the instructional
// setup card when no credentials are available at all. No mock / local simulation in normal path.
ipcMain.handle('agent-generate-html', async (event, prompt) => {
  try {
    logToFile(`Agent request for prompt: ${prompt.substring(0, 100)}...`);
    const settings = loadSettings();

    try {
      const realHtml = await callRealAgent(prompt, settings);
      if (realHtml) {
        return realHtml;
      }
    } catch (realErr) {
      logToFile(`Real agent failed: ${realErr.message}`);
    }

    // No credentials or all real attempts failed → clean setup card (never mock content)
    return getSetupRequiredHtml(prompt);
  } catch (err) {
    logToFile(`Unexpected agent error: ${err.message}`);
    return getSetupRequiredHtml(prompt);
  }
});

function getSetupRequiredHtml(prompt) {
  const safe = prompt.replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui;background:#f8fafc;color:#0f172a;padding:16px;margin:0}.card{max-width:600px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 4px 6px -1px rgb(15 23 42 / 0.07)}h2{color:#059669;margin-top:0}.badge{font-size:10px;padding:2px 8px;background:#d1fae5;color:#059669;border-radius:999px}</style></head><body><div class="card"><h2>Setup Required for Real AI <span class="badge">GROK</span></h2><p><strong>Your prompt:</strong> ${safe}</p><p>This Harness app requires a real LLM (Grok) to generate the HTML response cards.</p><p><strong>Quick fix:</strong></p><ol><li>Open your terminal and run: <code>grok login</code></li><li>Restart this app, or click the gear icon (⚙) in the header and select "Grok (auto from your CLI login)"</li><li>Alternatively, add an xAI or OpenAI-compatible API key in Settings.</li></ol><p>Once configured, every prompt will produce a real, rich, self-contained interactive HTML artifact exactly as specified in the HTML_CONTRACT.</p><button onclick="parent.postMessage({type:'harness-request', action:'open-settings'}, '*')">Open Settings</button></div></body></html>`;
}

// Legacy mock wrappers (generateMockHtmlResponse + tryRealAgent) removed in 0.1.2.
// The only agent path is callRealAgent (real Grok CLI or BYOK) or the explicit setup card.
// This keeps the binary clean and guarantees "no mock responses" for users.

function getGrokCliToken() {
  try {
    const authPath = path.join(os.homedir(), '.grok', 'auth.json');
    if (!fs.existsSync(authPath)) return null;
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));

    // Robust extraction for real Grok CLI auth.json shape (observed: { "https://auth.x.ai::UUID": { key: "eyJ..." } })
    // Try known shapes + any plausible JWT under nested objects
    for (const k of Object.keys(auth)) {
      if (/auth\.x\.ai|x\.ai/i.test(k)) {
        const val = auth[k];
        if (val && typeof val === 'object' && typeof val.key === 'string' && val.key.length > 50) {
          return val.key;
        }
      }
    }
    if (typeof auth.key === 'string' && auth.key.startsWith('ey')) return auth.key;

    // Fallback scan
    for (const v of Object.values(auth)) {
      if (typeof v === 'string' && v.startsWith('eyJ') && v.length > 100) return v;
      if (v && typeof v === 'object' && typeof v.key === 'string' && v.key.startsWith('eyJ')) return v.key;
    }
    return null;
  } catch (e) {
    logToFile('getGrokCliToken parse error: ' + e.message);
    return null;
  }
}

function getHtmlContractSystemPrompt() {
  // In production, this should load the full HTML_CONTRACT.html
  // For the exe, we embed the critical instructions.
  return `You are operating in HTML-first mode for Harness.

Your ONLY final output for this turn MUST be one complete, self-contained, production-quality HTML5 document beginning with <!doctype html> and ending with </html>.

Rules (non-negotiable):
- Standalone & self-contained. Render perfectly when opened directly.
- Beautiful by default. Strong visual hierarchy, generous whitespace, modern UI patterns (cards, badges, progress, interactive elements), consistent with the project's design language (emerald accents, clean typography, intentional spacing).
- Purposeful interactivity. At least one useful interactive element (buttons, forms, live computation, etc.). Use vanilla JS.
- Progressive enhancement. The HTML must be excellent standalone. Detect window.harness if present for richer behaviors.
- No markdown fences. Output ONLY the raw HTML document.
- Quality bar. Intentional, accessible, responsive, fast, scannable. Choose the right scale (quick card or full experience).
- The response is the HTML artifact. The user will see it rendered as a first-class card in the conversation.

When the user asks a question, your response is the HTML artifact that best advances their goal. Design and deliver the answer as the HTML.`;
}

function stripMarkdownFences(text) {
  return text.replace(/```html\s*([\s\S]*?)```/g, '$1').trim();
}

/* generateLocalRichHtml (legacy local simulation with fake plans/dashboards) fully removed from active path in 0.1.2.
   Left commented (not deleted) so git history preserves the evolution, but it can NEVER be reached now.
   Only callRealAgent (real LLM + HTML_CONTRACT) or getSetupRequiredHtml are possible for users.
function generateLocalRichHtml(prompt) {
  // High-quality local simulation (production-grade fallback)
  // Uses the project's design system so cards feel intentional and match the rest of the harness.
  const safe = prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lower = prompt.toLowerCase();

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
}   // end of legacy — closing comment below deactivates the whole function
*/

// Graceful shutdown logging
app.on('before-quit', () => {
  logToFile('Application quitting gracefully.');
});

// Settings IPC
ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, settings) => {
  saveSettings(settings);
  return true;
});

// New for "auto require Grok during start": renderer can probe without sending a prompt
ipcMain.handle('check-grok-credentials', () => {
  const settings = loadSettings();
  const cliToken = getGrokCliToken();
  const hasCli = !!cliToken;
  const hasKey = !!(settings && settings.apiKey);
  const provider = settings && settings.provider ? settings.provider : (hasCli ? 'grok-cli' : null);
  return {
    hasCredentials: hasCli || hasKey,
    provider,
    cliTokenPresent: hasCli,
    keyPresent: hasKey
  };
});

// Real agent call (production)
async function callRealAgent(prompt, settings) {
  const systemPrompt = getHtmlContractSystemPrompt();

  let baseURL = settings.baseURL || 'https://api.x.ai/v1';
  let apiKey = settings.apiKey;
  let model = settings.model || 'grok-2-latest';

  if (settings.provider === 'grok-cli') {
    const token = getGrokCliToken();
    if (!token) throw new Error('No Grok CLI login found. Please run "grok login" first or configure API key in Settings.');
    baseURL = 'https://cli-chat-proxy.grok.com/v1';
    apiKey = token;
    // Headers are special for the proxy
  }

  if (!apiKey && settings.provider !== 'mock') {
    throw new Error('No API key configured. Go to Settings to add one (or use Grok CLI login).');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (settings.provider === 'grok-cli') {
    headers['X-XAI-Token-Auth'] = 'xai-grok-cli';
    headers['x-grok-model-override'] = 'grok-build';
    model = 'grok-build';
  }

  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`LLM error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  let content = data.choices?.[0]?.message?.content || '';
  content = stripMarkdownFences(content).trim();

  if (!content.includes('<!doctype') && !content.includes('<html')) {
    // Model didn't follow instructions — wrap it
    content = `<!doctype html><html><body><pre>${content}</pre></body></html>`;
  }

  logToFile('Real agent call succeeded');
  return content;
}

function getHtmlContractSystemPrompt() {
  // Embedded critical part of the contract for the packaged app
  return `You are operating in HTML-first mode for Harness.

Your ONLY final output for this turn MUST be one complete, self-contained, production-quality HTML5 document beginning with <!doctype html> and ending with </html>.

Rules (non-negotiable):
- Standalone & self-contained. Render perfectly when opened directly.
- Beautiful by default. Strong visual hierarchy, generous whitespace, modern UI patterns (cards, badges, progress, interactive elements), consistent with the project's design language.
- Purposeful interactivity. At least one useful interactive element.
- No markdown fences in the final output. Output ONLY the raw HTML document.
- The response is the HTML artifact the user will see and use.

When the user asks a question, your response is the HTML artifact that best advances their goal. Design and deliver the answer as the HTML.`;
}

function stripMarkdownFences(text) {
  return text.replace(/```html\s*([\s\S]*?)```/gi, '$1').replace(/```\s*([\s\S]*?)```/g, '$1').trim();
}
