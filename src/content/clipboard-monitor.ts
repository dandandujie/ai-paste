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
    // 只记录剪贴板内容，不触发浮窗显示
    // 浮窗显示由 ClipboardInterceptor 负责处理手动复制
    // ClipboardMonitor 只负责监控外部剪贴板变化（如点击复制按钮后的轮询检测）
    let copied = event.clipboardData?.getData('text/html');
    if (!copied || !copied.trim()) {
      copied = event.clipboardData?.getData('text/plain');
    }
    if (copied && copied.trim()) {
      this.lastClipboardText = copied;
      this.saveLastClipboard(copied);
      // 不再调用 onNewContent，避免与 ClipboardInterceptor 冲突
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
      // 优先尝试读取 HTML 格式
      const content = await this.readClipboardContent();
      if (content && content.trim() && content !== this.lastClipboardText) {
        this.lastClipboardText = content;
        this.saveLastClipboard(content);
        this.onNewContent(content);
      }
    } catch {
      // 权限错误或用户手势要求，暂停轮询
      this.stopPolling();
      // 如果仍在运行状态，延迟后尝试恢复监控
      if (this.isRunning) {
        setTimeout(() => this.refreshMonitoring(), this.pollInterval);
      }
    }
  }

  /**
   * 读取剪贴板内容，优先尝试 HTML 格式
   */
  private async readClipboardContent(): Promise<string> {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          // 检查是否包含数学公式
          if (html && /class=["']?katex|class=["']?MathJax|<mjx-container|<math[\s>]/i.test(html)) {
            return this.wrapMathInHtml(html);
          }
        }
      }
    } catch {
      // Clipboard API 不支持或权限不足
    }
    // 回退到纯文本
    return navigator.clipboard.readText();
  }

  /**
   * 在 HTML 中包裹数学公式
   */
  private wrapMathInHtml(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const mathSelectors = [
      '.katex-display',
      '.katex:not(.katex-display .katex)',
      '.MathJax_Display',
      '.MathJax:not(.MathJax_Display .MathJax)',
      'mjx-container',
      'math'
    ];

    mathSelectors.forEach(selector => {
      tempDiv.querySelectorAll(selector).forEach(mathEl => {
        if (mathEl.parentElement?.classList.contains('ai-paste-math-wrapper')) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'ai-paste-math-wrapper';
        wrapper.innerHTML = `<!--RENDERED_MATH_START-->${mathEl.outerHTML}<!--RENDERED_MATH_END-->`;
        mathEl.replaceWith(wrapper);
      });
    });

    return tempDiv.innerHTML;
  }
}
