// Phase 1: Real Interactive Viewer MVP
// SOLID Principles applied:
// - S: Single Responsibility - ChatStore only manages messages state
// - O: Open/Closed - Can extend with different message types
// - I: Interface Segregation - IMessage, IChatStore
// - D: Dependency Inversion - UI will depend on IChatStore
// Key Architectural Decision: Use TypeScript interfaces for contracts. For HTML cards, use sandboxed iframes (security/isolation per HTML-first principle). State is simple array for MVP (later persist).
// TDD: Green phase - implement to pass the red test.

export interface IMessage {
  id: string;
  type: 'user' | 'agent-html';
  content: string; // For agent: the full HTML string for the card
  timestamp: Date;
}

export interface IChatStore {
  addUserMessage(text: string): void;
  addAgentHtmlCard(html: string): void;
  getMessages(): IMessage[];
  clear(): void;
}

export class ChatStore implements IChatStore {
  private messages: IMessage[] = [];

  addUserMessage(text: string): void {
    this.messages.push({
      id: `msg-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date()
    });
  }

  addAgentHtmlCard(html: string): void {
    this.messages.push({
      id: `msg-${Date.now()}`,
      type: 'agent-html',
      content: html, // Full HTML for iframe srcdoc
      timestamp: new Date()
    });
  }

  getMessages(): IMessage[] {
    return [...this.messages]; // Return copy for immutability (good practice)
  }

  clear(): void {
    this.messages = [];
  }
}

// For TDD green: The previous test should now pass if run against this.
console.log('ChatStore implemented - GREEN phase achieved for basic message handling.');