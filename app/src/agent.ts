// Phase 2: Real Agent Integration (SOLID: I for Interface Segregation - IAgentClient; D for Dependency Inversion)
// Key Arch Decision: Use interface so we can swap Mock <-> Real LLM without changing UI (Open/Closed).
// Enforces HTML_CONTRACT by prepending it to prompts in real impl.
// TDD: Tests would check that response is valid HTML.

export interface IAgentClient {
  generateHtmlCard(prompt: string, previousCards?: string[]): Promise<string>;
}

export class MockAgentClient implements IAgentClient {
  async generateHtmlCard(prompt: string, previousCards: string[] = []): Promise<string> {
    // For MVP/Phase 1-2: Return a rich HTML based on prompt (simulates contract-following agent)
    const safePrompt = prompt.replace(/</g, '&lt;');
    return `<!doctype html><html><head><meta charset="UTF-8"><style>body { font-family: system-ui; padding: 12px; background: #f8fafc; } .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white; max-width: 400px; }</style></head>
<body><div class="card"><h3>HTML Card Response (Phase 2 Agent)</h3><p>Prompt: ${safePrompt}</p><p>This is a self-contained, interactive HTML response generated following the HTML_CONTRACT. In real integration, this comes from LLM with the full contract prepended.</p><button onclick="alert('Card JS works!')">Interact</button></div></body></html>`;
  }
}

// Placeholder for real (Phase 2 full): Would fetch to /api or direct LLM with contract + prompt.
export class RealAgentClient implements IAgentClient {
  async generateHtmlCard(prompt: string, previousCards: string[] = []): Promise<string> {
    // TODO: Call real LLM (Grok/OpenAI compatible) with HTML_CONTRACT prepended.
    // For now, delegate to mock.
    const mock = new MockAgentClient();
    return mock.generateHtmlCard(prompt, previousCards);
  }
}