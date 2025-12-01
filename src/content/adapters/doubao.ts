import { BaseAdapter } from './base';

export class DoubaoAdapter extends BaseAdapter {
  name = '豆包';
  hostnames = ['www.doubao.com'];
  selectors = {
    messageContainer: '.message-item',
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
