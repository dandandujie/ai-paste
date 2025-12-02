import { convertMarkdown, extractPlainText } from './markdown-converter';
import { applyStyles } from './style-applier';
import { buildClipboardItem } from './math-clipboard';
import { getCurrentPreset, getSettings } from '@/utils/storage';
import type { ConvertedContent } from '@/types';

export async function processContent(
  content: string,
  sourceType: 'markdown' | 'html'
): Promise<ConvertedContent> {
  const preset = await getCurrentPreset();

  let html: string;
  let plainText: string;

  if (sourceType === 'markdown') {
    html = await convertMarkdown(content, true);
    plainText = extractPlainText(content);
  } else {
    html = content;
    plainText = stripHtmlTags(content);
  }

  const styledHtml = applyStyles(html, preset);

  const hasFormula =
    content.includes('$') ||
    content.includes('\\(') ||
    content.includes('\\[');

  return {
    html: styledHtml,
    plainText,
    hasFormula
  };
}

function stripHtmlTags(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

export async function writeToClipboard(
  html: string,
  plainText: string
): Promise<boolean> {
  try {
    const clipboardItem = buildClipboardItem(html, plainText);

    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return fallbackCopy(html);
  }
}

function fallbackCopy(html: string): boolean {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const selection = window.getSelection()!;
  const range = document.createRange();
  range.selectNodeContents(container);
  selection.removeAllRanges();
  selection.addRange(range);

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }

  selection.removeAllRanges();
  document.body.removeChild(container);

  return success;
}

export async function shouldIntercept(): Promise<boolean> {
  const settings = await getSettings();
  return settings.enabled && settings.autoIntercept;
}

export function showNotification(message: string, type: 'success' | 'error' = 'success') {
  const notification = document.createElement('div');
  notification.className = 'ai-paste-notification';
  notification.innerHTML = `
    <div class="ai-paste-notification-content ${type}">
      <span class="ai-paste-notification-icon">${type === 'success' ? '✓' : '✗'}</span>
      <span class="ai-paste-notification-text">${message}</span>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .ai-paste-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      animation: ai-paste-slide-in 0.3s ease;
    }
    .ai-paste-notification-content {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .ai-paste-notification-content.success {
      background: #22c55e;
      color: white;
    }
    .ai-paste-notification-content.error {
      background: #ef4444;
      color: white;
    }
    .ai-paste-notification-icon {
      font-size: 16px;
    }
    @keyframes ai-paste-slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'ai-paste-slide-in 0.3s ease reverse';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 2000);
}
