import { BaseAdapter } from './base';

export class ChatGPTAdapter extends BaseAdapter {
  name = 'ChatGPT';
  hostnames = ['chat.openai.com', 'chatgpt.com'];
  selectors = {
    messageContainer: '[data-message-author-role]',
    assistantMessage: '[data-message-author-role="assistant"]',
    codeBlock: 'pre code',
    mathBlock: '.katex, .math'
  };

  isAssistantMessage(element: Element): boolean {
    const container = element.closest('[data-message-author-role]');
    return container?.getAttribute('data-message-author-role') === 'assistant';
  }
}
