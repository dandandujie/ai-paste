interface ClipboardMessage {
  target: string;
  type: string;
  data: {
    html: string;
    plainText: string;
  };
}

chrome.runtime.onMessage.addListener((message: ClipboardMessage) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'CLIPBOARD_WRITE') {
    writeToClipboard(message.data.html, message.data.plainText);
  }
});

import { buildClipboardItem } from '@/lib/math-clipboard';

async function writeToClipboard(html: string, plainText: string) {
  try {
    const clipboardItem = buildClipboardItem(html, plainText);

    await navigator.clipboard.write([clipboardItem]);
  } catch (error) {
    console.error('Failed to write to clipboard:', error);

    const container = document.getElementById('clipboard-container')!;
    container.innerHTML = html;

    const selection = window.getSelection()!;
    selection.removeAllRanges();

    const range = document.createRange();
    range.selectNodeContents(container);
    selection.addRange(range);

    document.execCommand('copy');
    selection.removeAllRanges();
    container.innerHTML = '';
  }
}
