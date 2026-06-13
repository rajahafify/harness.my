// Phase 1 TDD - Red phase: Test for ChatStore (SOLID: Single Responsibility - manages only conversation state)
// Using simple test runner simulation since no full Vitest yet. In real: import { describe, it, expect } from 'vitest';

import { ChatStore } from '../src/chat'; // Will implement

// RED: This test will fail initially
console.log('Running RED test for ChatStore.addUserMessage...');

const store = new ChatStore();
store.addUserMessage('Test prompt for HTML card');

if (store.getMessages().length !== 1 || store.getMessages()[0].type !== 'user') {
  console.error('RED: Test failed - expected user message in store');
  throw new Error('RED phase: ChatStore does not handle user messages correctly');
} else {
  console.log('RED test would fail without impl - proceeding to implement');
}

// After impl, this will be green, then refactor.