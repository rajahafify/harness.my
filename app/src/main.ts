// Main entry for Vite - Phases 1-6 MVP
// Imports the SOLID modules
import { ChatStore } from './chat';
import { MockAgentClient } from './agent';
import { LocalStoragePersistence } from './persistence';
import { setupBridge } from './bridge';

const store = new ChatStore();
const persistence = new LocalStoragePersistence();
const agentClient = new MockAgentClient();
const threadEl = document.getElementById('chat-thread') as HTMLDivElement;
const inputEl = document.getElementById('prompt-input') as HTMLInputElement;

// Phase 3 persistence restore
const saved = persistence.load('current-session');
if (saved && Array.isArray(saved)) {
  saved.forEach((m: any) => {
    if (m.type === 'user') store.addUserMessage(m.content);
    else if (m.type === 'agent-html') store.addAgentHtmlCard(m.content);
  });
}

function renderThread() {
  if (!threadEl) return;
  threadEl.innerHTML = '';
  store.getMessages().forEach(msg => {
    const div = document.createElement('div');
    div.className = 'max-w-[820px] mx-auto message';
    if (msg.type === 'user') {
      div.innerHTML = `<div class="flex justify-end"><div class="user-bubble px-3 py-2 text-sm max-w-[70%]">${msg.content}</div></div>`;
    } else {
      const iframeId = `iframe-${msg.id}`;
      div.innerHTML = `
        <div class="agent-card">
          <div class="px-3 py-1.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center text-xs">
            <span class="font-semibold text-emerald-700">Agent HTML Card</span>
            <span class="ml-auto text-[#64748b]">${msg.timestamp.toLocaleTimeString()}</span>
          </div>
          <iframe id="${iframeId}" class="html-card-frame" sandbox="allow-scripts allow-same-origin"></iframe>
          <div class="px-3 py-2 border-t bg-[#f8fafc] text-[10px] flex gap-2">
            <button onclick="expandCard('${msg.id}')" class="px-2 py-0.5 text-emerald-700 hover:bg-white rounded">Expand</button>
            <button onclick="followUpFromCard('${msg.id}')" class="px-2 py-0.5 text-emerald-700 hover:bg-white rounded">Follow up</button>
          </div>
        </div>`;
      setTimeout(() => {
        const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
        if (iframe) {
          iframe.srcdoc = msg.content;
          setupBridge(iframe, (payload: any) => {
            const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
            promptInput.value = typeof payload === 'string' ? payload : (payload?.action || 'Follow up from card');
            (window as any).sendPrompt();
          });
        }
      }, 20);
    }
    threadEl.appendChild(div);
  });
  threadEl.scrollTop = threadEl.scrollHeight;
  persistence.save('current-session', store.getMessages());
}

// Expose sendPrompt globally for the HTML onclick and key handlers
(window as any).sendPrompt = async function() {
  if (!inputEl) return;
  const val = inputEl.value.trim();
  if (!val) return;

  store.addUserMessage(val);
  renderThread();

  // Phase 2: agent
  const html = await agentClient.generateHtmlCard(val);
  store.addAgentHtmlCard(html);
  renderThread();

  inputEl.value = '';
};

(window as any).expandCard = function(id: string) {
  const msg = store.getMessages().find((m: any) => m.id === id);
  if (msg) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) w.document.write(msg.content);
  }
};

(window as any).followUpFromCard = function(id: string) {
  if (inputEl) {
    inputEl.value = 'Please improve or expand the previous card';
    (window as any).sendPrompt();
  }
};

// Initial demo cards
setTimeout(() => {
  if (store.getMessages().length === 0) {
    store.addUserMessage('Create an interactive plan for the next phases');
    store.addAgentHtmlCard(`<!doctype html><html><head><style>body{font-family:sans-serif;padding:10px;background:#f8fafc;font-size:13px}.card{border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:white}</style></head><body><div class="card"><strong>Interactive Plan — Next Phases</strong><div style="margin:8px 0">• Phase 1-6 MVP complete<br>• Rich HTML cards working<br>• Bridge + persistence active</div><button onclick="alert('Card JS is live!');parent.postMessage({type:'harness-request',action:'requestFollowUp',payload:'Add more polish'},'*')" style="font-size:11px;padding:3px 8px;background:#10b981;color:white;border:none;border-radius:4px">Mark done + follow up</button></div></body></html>`);

    store.addUserMessage('Show a progress dashboard with sound');
    store.addAgentHtmlCard(`<!doctype html><html><head><style>body{font-family:sans-serif;padding:10px;background:#f8fafc}</style></head><body><div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:white"><strong>Progress Dashboard</strong><div style="margin:6px 0">58% complete</div><button onclick="alert('🔊 Sound would play (Web Audio API in real card)')" style="font-size:11px">🔊 Play status sound</button></div></body></html>`);

    renderThread();
  }
}, 400);

console.log('%c[Harness.my Vite] Dev app running. Use the input at the bottom of the main column. Cards are rich HTML.', 'color:#10b981');