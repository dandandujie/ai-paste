import { BaseAdapter } from './base';

export class GeminiAdapter extends BaseAdapter {
  name = 'Gemini';
  hostnames = ['gemini.google.com'];
  selectors = {
    messageContainer: 'message-content',
    assistantMessage: 'model-response',
    codeBlock: 'pre code',
    mathBlock: '.katex'
  };

  isAssistantMessage(element: Element): boolean {
    return !!element.closest('model-response');
  }
}
