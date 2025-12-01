import type { Message, ConvertRequest, ConvertedContent } from '@/types';

export function sendMessage<T = unknown>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export function sendToTab<T = unknown>(tabId: number, message: Message): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message);
}

export async function convertContent(request: ConvertRequest): Promise<ConvertedContent> {
  return sendMessage<ConvertedContent>({
    type: 'CONVERT_CONTENT',
    payload: request
  });
}

export async function writeToClipboard(html: string, plainText: string): Promise<void> {
  return sendMessage({
    type: 'WRITE_CLIPBOARD',
    payload: { html, plainText }
  });
}

export async function triggerManualConvert(): Promise<void> {
  return sendMessage({
    type: 'MANUAL_CONVERT'
  });
}
