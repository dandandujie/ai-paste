import { BaseAdapter } from './base';

export class TongyiAdapter extends BaseAdapter {
  name = '通义千问';
  hostnames = ['tongyi.aliyun.com'];
  selectors = {
    messageContainer: '.chat-item',
    assistantMessage: '.chat-item--ai, .assistant-message',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    return !!element.closest('.chat-item--ai, .assistant-message');
  }
}
