import { BaseAdapter } from './base';

export class ClaudeAdapter extends BaseAdapter {
  name = 'Claude';
  hostnames = ['claude.ai'];
  selectors = {
    messageContainer: '[data-testid="conversation-turn"]',
    assistantMessage: '.font-claude-message',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    return !!element.closest('.font-claude-message');
  }
}
