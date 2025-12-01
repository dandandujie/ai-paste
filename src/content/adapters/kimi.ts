import { BaseAdapter } from './base';

export class KimiAdapter extends BaseAdapter {
  name = 'Kimi';
  hostnames = ['kimi.moonshot.cn'];
  selectors = {
    messageContainer: '.chat-message',
    assistantMessage: '.chat-message-assistant, .assistant-message',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    return !!element.closest('.chat-message-assistant, .assistant-message');
  }
}
