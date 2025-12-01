import { BaseAdapter } from './base';

export class DeepSeekAdapter extends BaseAdapter {
  name = 'DeepSeek';
  hostnames = ['chat.deepseek.com'];
  selectors = {
    messageContainer: '.message-container',
    assistantMessage: '.assistant-message, [data-role="assistant"]',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    const container = element.closest('[data-role]');
    return container?.getAttribute('data-role') === 'assistant' ||
           !!element.closest('.assistant-message');
  }
}
