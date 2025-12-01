import { BaseAdapter } from './base';

export class ChatGLMAdapter extends BaseAdapter {
  name = 'ChatGLM';
  hostnames = ['chatglm.cn'];
  selectors = {
    messageContainer: '.message-item',
    assistantMessage: '.assistant-message, .bot-message',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    return !!element.closest('.assistant-message, .bot-message');
  }
}
