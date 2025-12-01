/**
 * 剪贴板监控器
 * 当页面处于前台且剪贴板有新内容时触发回调
 */
export class ClipboardMonitor {
  private pollInterval = 1500;
  private pollTimer: number | undefined;
  private lastClipboardText = '';
  private onNewContent: (text: string) => void;
  private isRunning = false;

  constructor(onNewContent: (text: string) => void) {
    this.onNewContent = onNewContent;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('copy', this.handleCopy, true);

    this.refreshMonitoring();
    console.log('[AI-Paste] Clipboard monitor started');
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
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim() && text !== this.lastClipboardText) {
        this.lastClipboardText = text;
        this.onNewContent(text);
      }
    } catch {
      // 权限错误或用户手势要求，暂停轮询直到下次 focus
      this.stopPolling();
    }
  }
}
