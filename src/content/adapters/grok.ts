import { BaseAdapter } from './base';

export class GrokAdapter extends BaseAdapter {
  name = 'Grok';
  hostnames = ['grok.com', 'x.com'];
  selectors = {
    messageContainer: '.message-container',
    assistantMessage: '.grok-message, [data-role="assistant"]',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    const container = element.closest('[data-role]');
    return container?.getAttribute('data-role') === 'assistant' ||
           !!element.closest('.grok-message');
  }
}
