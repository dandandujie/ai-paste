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
  const clipboardItem = buildClipboardItem(html, plainText);

  // 尝试主要方法
  try {
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    console.warn('[AI-Paste] Primary clipboard write failed:', error);
  }

  // Fallback: 使用 execCommand 复制 HTML（Windows 兼容性更好）
  return fallbackCopy(html);
}

function fallbackCopy(html: string): boolean {
  // 包装 HTML 为 Word 兼容格式
  const wrappedHtml = wrapHtmlForFallback(html);

  const container = document.createElement('div');
  container.innerHTML = wrappedHtml;
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
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

/**
 * 为 fallback 复制包装 HTML，确保 Word 兼容性
 */
function wrapHtmlForFallback(html: string): string {
  // 如果已经是完整文档，直接返回
  if (html.trim().startsWith('<!DOCTYPE') || html.trim().startsWith('<html')) {
    return html;
  }
  return html;
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
