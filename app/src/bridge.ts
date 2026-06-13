// Phase 4: Harness Bridge (SOLID: Single responsibility for communication)
// Key Arch Decision: Use postMessage for iframe <-> parent. Secure with origin check and message types.
// Allows HTML cards to call back (e.g. requestFollowUp which adds new prompt to chat).

export function setupBridge(iframe: HTMLIFrameElement, onFollowUp: (action: string, payload?: any) => void) {
  window.addEventListener('message', (event) => {
    // Security: In prod, check event.origin
    if (event.data?.type === 'harness-request') {
      const { action, payload } = event.data;
      if (action === 'requestFollowUp') {
        onFollowUp(payload || 'Follow up from card', payload);
      }
    }
  });

  // Inject simple harness API into iframe (for cards to use window.parent.postMessage or injected)
  const injectScript = `
    window.harness = {
      requestFollowUp: (action, payload) => window.parent.postMessage({ type: 'harness-request', action: 'requestFollowUp', payload: {action, payload} }, '*'),
      // Other methods...
    };
  `;
  // In real, inject via srcdoc or post load.
  console.log('Bridge setup for iframe (Phase 4)');
}