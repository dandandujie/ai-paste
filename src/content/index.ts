import { ClipboardInterceptor } from './clipboard-interceptor';
import { getFloatingPanel } from './floating-panel';
import { ClipboardMonitor } from './clipboard-monitor';
import { getSettings } from '@/utils/storage';

const interceptor = new ClipboardInterceptor();
interceptor.init();

// 剪贴板监控：当页面处于前台且有新内容时自动弹出浮窗
const monitor = new ClipboardMonitor(async (text) => {
  const settings = await getSettings();
  if (!settings.enabled || !settings.showFloatingPanel) return;

  const panel = getFloatingPanel();
  panel.show(text, async (html, plainText) => {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob
        })
      ]);
    } catch (error) {
      console.error('[AI-Paste] Clipboard write error:', error);
    }
  });
});
monitor.start();

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_FLOATING_PANEL') {
    const panel = getFloatingPanel();
    panel.toggle();
    sendResponse({ success: true });
  }
  return true;
});

console.log('[AI-Paste] Content script loaded');
