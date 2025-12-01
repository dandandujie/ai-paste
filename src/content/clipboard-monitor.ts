const STORAGE_KEY = 'ai_paste_last_clipboard';

/**
 * 剪贴板监控器
 * 当页面处于前台且剪贴板有新内容时触发回调
 * 使用 chrome.storage.local 跨页面共享已处理的剪贴板内容
 */
export class ClipboardMonitor {
  private pollInterval = 1500;
  private pollTimer: number | undefined;
  private lastClipboardText = '';
  private onNewContent: (text: string) => void;
  private isRunning = false;
  private initialized = false;

  constructor(onNewContent: (text: string) => void) {
    this.onNewContent = onNewContent;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 从 storage 加载上次处理过的剪贴板内容
    await this.loadLastClipboard();
    this.initialized = true;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('copy', this.handleCopy, true);

    this.refreshMonitoring();
    console.log('[AI-Paste] Clipboard monitor started');
  }

  private async loadLastClipboard() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        this.lastClipboardText = result[STORAGE_KEY];
      }
    } catch {
      // ignore
    }
  }

  private async saveLastClipboard(text: string) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: text });
    } catch {
      // ignore
    }
  }

  stop() {
    this.isRunning = false;
    this.stopPolling();

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('copy', this.handleCopy, true);

    console.log('[AI-Paste] Clipboard monitor stopped');
  }

  private isForeground(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  private handleVisibilityChange = () => {
    this.refreshMonitoring();
  };

  private handleFocus = () => {
    this.refreshMonitoring();
  };

  private handleBlur = () => {
    this.refreshMonitoring();
  };

  private handleCopy = (event: ClipboardEvent) => {
    const copied = event.clipboardData?.getData('text/plain');
    if (copied && copied.trim()) {
      this.lastClipboardText = copied;
      this.saveLastClipboard(copied);
      this.onNewContent(copied);
    }
  };

  private refreshMonitoring() {
    if (this.isRunning && this.isForeground()) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling() {
    if (this.pollTimer !== undefined) return;

    this.pollTimer = window.setInterval(() => {
      this.checkClipboard();
    }, this.pollInterval);

    // 立即检查一次
    this.checkClipboard();
  }

  private stopPolling() {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async checkClipboard() {
    if (!this.initialized) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim() && text !== this.lastClipboardText) {
        this.lastClipboardText = text;
        this.saveLastClipboard(text);
        this.onNewContent(text);
      }
    } catch {
      // 权限错误或用户手势要求，暂停轮询直到下次 focus
      this.stopPolling();
    }
  }
}
