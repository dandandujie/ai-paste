import { getAdapter } from './adapters';
import { processContent, writeToClipboard, showNotification } from '@/lib/clipboard-handler';
import { getSettings } from '@/utils/storage';
import { getFloatingPanel } from './floating-panel';

export class ClipboardInterceptor {
  private adapter = getAdapter();
  private isProcessing = false;
  private floatingPanel = getFloatingPanel();
  private lastClipboardContent = '';

  init() {
    console.log('[AI-Paste] Content script initializing...');
    console.log('[AI-Paste] Current hostname:', window.location.hostname);

    if (!this.adapter) {
      console.log('[AI-Paste] No adapter found for this site, using generic mode');
    } else {
      console.log(`[AI-Paste] Initialized for ${this.adapter.name}`);
    }

    this.setupCopyListener();
    this.setupClipboardMonitor();
    this.setupCopyButtonListener();
    this.setupMessageListener();
    console.log('[AI-Paste] All listeners attached');
  }

  private setupCopyListener() {
    document.addEventListener('copy', async (event) => {
      console.log('[AI-Paste] Copy event detected');
      const settings = await getSettings();
      console.log('[AI-Paste] Settings:', settings);

      if (!settings.enabled || !settings.autoIntercept) {
        console.log('[AI-Paste] Extension disabled or autoIntercept off');
        return;
      }

      if (this.isProcessing) {
        console.log('[AI-Paste] Already processing, skip');
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        console.log('[AI-Paste] No selection');
        return;
      }

      const content = this.extractSelectedContent(selection);
      console.log('[AI-Paste] Extracted content:', content?.substring(0, 100));
      if (!content) {
        console.log('[AI-Paste] No content extracted');
        return;
      }

      // 如果启用了浮动面板模式，显示面板让用户设置格式
      if (settings.showFloatingPanel) {
        console.log('[AI-Paste] Showing floating panel');
        event.preventDefault();
        this.showFloatingPanel(content, settings.showNotification);
        return;
      }

      // 否则使用原有的自动转换模式
      event.preventDefault();
      this.isProcessing = true;

      try {
        const result = await processContent(content, 'markdown');
        const success = await writeToClipboard(result.html, result.plainText);

        if (settings.showNotification) {
          if (success) {
            showNotification('已转换为 Word 格式', 'success');
          } else {
            showNotification('转换失败', 'error');
          }
        }
      } catch (error) {
        console.error('[AI-Paste] Error processing content:', error);
        if (settings.showNotification) {
          showNotification('转换失败', 'error');
        }
      } finally {
        this.isProcessing = false;
      }
    }, true);
  }

  private async showFloatingPanel(content: string, showNotification_: boolean) {
    this.lastClipboardContent = content;
    await this.floatingPanel.show(content, async (html, text) => {
      const success = await writeToClipboard(html, text);
      if (showNotification_) {
        if (success) {
          showNotification('已复制格式化内容', 'success');
        } else {
          showNotification('复制失败', 'error');
        }
      }
    });
  }

  /**
   * 读取剪贴板内容，优先尝试 HTML 格式
   */
  private async readClipboardContent(): Promise<string> {
    try {
      // 尝试使用 Clipboard API 读取 HTML
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // 优先读取 HTML 格式
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          // 检查 HTML 是否包含数学公式（支持单引号和双引号）
          if (html && this.containsMathElements(html)) {
            // 包裹已渲染的公式
            return this.wrapMathInHtml(html);
          }
        }
      }
    } catch {
      // Clipboard API 不支持或权限不足，回退到 readText
    }

    // 回退到纯文本
    return navigator.clipboard.readText();
  }

  /**
   * 检测 HTML 是否包含数学公式元素
   */
  private containsMathElements(html: string): boolean {
    return /class=["']?katex|class=["']?MathJax|<mjx-container|<math[\s>]|data-latex=|<!--RENDERED_MATH_START-->/i.test(html);
  }

  /**
   * 在 HTML 字符串中包裹已渲染的数学公式
   */
  private wrapMathInHtml(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    this.wrapRenderedMath(tempDiv);
    return tempDiv.innerHTML;
  }

  // 监控剪贴板变化（检测网页复制按钮）
  private setupClipboardMonitor() {
    const checkClipboard = async (forceShow: boolean = false) => {
      try {
        const settings = await getSettings();
        if (!settings.enabled || !settings.showFloatingPanel) return;

        // 尝试读取 HTML 格式，如果失败则回退到纯文本
        let content = await this.readClipboardContent();

        // forceShow 时即使内容相同也显示浮窗
        if (content && content.trim().length > 0 && (forceShow || content !== this.lastClipboardContent)) {
          console.log('[AI-Paste] Clipboard change detected via monitor');
          this.lastClipboardContent = content;
          this.showFloatingPanel(content, settings.showNotification);
        }
      } catch {
        // 剪贴板读取失败，忽略
      }
    };

    // 当窗口获得焦点时检查剪贴板
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => checkClipboard(false), 100);
      }
    });

    // 监听点击事件后检查剪贴板
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // 检测是否点击了复制相关的按钮或图标
      const isCopyButton =
        target.closest('[data-copy]') ||
        target.closest('[class*="copy"]') ||
        target.closest('[class*="Copy"]') ||
        target.closest('button')?.textContent?.includes('复制') ||
        target.closest('button')?.textContent?.toLowerCase().includes('copy') ||
        target.closest('[aria-label*="copy"]') ||
        target.closest('[aria-label*="Copy"]') ||
        target.closest('[aria-label*="复制"]') ||
        target.closest('[title*="copy"]') ||
        target.closest('[title*="复制"]') ||
        // DeepSeek 等网站的复制按钮可能是 SVG 图标
        target.closest('svg')?.parentElement?.closest('button') ||
        target.closest('[data-testid*="copy"]') ||
        target.closest('[data-action*="copy"]');

      if (isCopyButton) {
        console.log('[AI-Paste] Copy button clicked, checking clipboard...');
        // 延迟检查，等待复制完成，强制显示浮窗
        setTimeout(() => checkClipboard(true), 500);
      }
    }, true);
  }

  // 监听常见的复制按钮
  private setupCopyButtonListener() {
    const observer = new MutationObserver(() => {
      this.attachCopyButtonHandlers();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初始绑定
    setTimeout(() => this.attachCopyButtonHandlers(), 1000);
  }

  private attachCopyButtonHandlers() {
    // 查找常见的复制按钮选择器
    const copySelectors = [
      'button[data-copy]',
      'button[class*="copy"]',
      '[role="button"][class*="copy"]',
      'button[aria-label*="Copy"]',
      'button[aria-label*="复制"]',
    ];

    copySelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        if ((btn as any).__aiPasteHandled) return;
        (btn as any).__aiPasteHandled = true;

        btn.addEventListener('click', async () => {
          console.log('[AI-Paste] Copy button handler triggered');
          try {
            const settings = await getSettings();
            if (!settings.enabled) return;

            const container = this.adapter?.getMessageContainer(btn as Element) || btn.closest('article, section, div');
            if (!container || !this.adapter?.isAssistantMessage(container)) {
              // 找不到消息容器时，回退到读取剪贴板文本
              if (!settings.showFloatingPanel) return;
              const text = await navigator.clipboard.readText().catch(() => '');
              if (!text) return;
              this.lastClipboardContent = text;
              this.showFloatingPanel(text, settings.showNotification);
              return;
            }

            const content = this.adapter.extractContent(container);
            if (!content) return;

            this.lastClipboardContent = content;

            if (settings.showFloatingPanel) {
              this.showFloatingPanel(content, settings.showNotification);
            } else {
              const result = await processContent(content, 'markdown');
              const success = await writeToClipboard(result.html, result.plainText);
              if (settings.showNotification) {
                showNotification(success ? '已转换为 Word 格式' : '转换失败', success ? 'success' : 'error');
              }
            }
          } catch (e) {
            console.log('[AI-Paste] Copy button handler error:', e);
          }
        });
      });
    });
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'MANUAL_CONVERT') {
        this.handleManualConvert()
          .then(sendResponse)
          .catch((err) => {
            console.error('[AI-Paste] Manual convert failed:', err);
            sendResponse({ success: false, error: err?.message ?? 'Manual convert failed' });
          });
        return true;
      }
    });
  }

  private async handleManualConvert() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      showNotification('请先选中要转换的内容', 'error');
      return { success: false };
    }

    const content = this.extractSelectedContent(selection);
    if (!content) {
      showNotification('无法提取内容', 'error');
      return { success: false };
    }

    try {
      const result = await processContent(content, 'markdown');
      const success = await writeToClipboard(result.html, result.plainText);

      if (success) {
        showNotification('已转换为 Word 格式', 'success');
      } else {
        showNotification('转换失败', 'error');
      }

      return { success };
    } catch (error) {
      console.error('[AI-Paste] Error in manual convert:', error);
      showNotification('转换失败', 'error');
      return { success: false };
    }
  }

  private extractSelectedContent(selection: Selection): string | null {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    const element = container.nodeType === Node.ELEMENT_NODE
      ? container as Element
      : container.parentElement;

    if (!element) return null;

    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);

    const htmlContent = tempDiv.innerHTML;
    console.log('[AI-Paste] extractSelectedContent HTML:', htmlContent.substring(0, 500));

    // 如果只有纯文本（没有子元素）
    if (tempDiv.children.length === 0 && tempDiv.textContent) {
      return tempDiv.textContent;
    }

    // 检查是否包含已渲染的数学公式（KaTeX/MathJax）
    // 使用多种方式检测：DOM 查询 + HTML 字符串匹配
    const hasMathElements = tempDiv.querySelector('.katex, .MathJax, mjx-container, .math-container, math');
    const hasMathInHtml = this.containsMathElements(htmlContent);

    console.log('[AI-Paste] hasMathElements:', !!hasMathElements, 'hasMathInHtml:', hasMathInHtml);

    if (hasMathElements || hasMathInHtml) {
      // 保留 HTML 结构，用特殊标记包裹已渲染的公式
      this.wrapRenderedMath(tempDiv);
      const result = tempDiv.innerHTML;
      console.log('[AI-Paste] Returning HTML with math:', result.substring(0, 300));
      return result;
    }

    // 如果有 adapter，使用 adapter 提取
    if (this.adapter) {
      const extracted = this.adapter.extractContent(tempDiv);
      if (extracted) return extracted;
    }

    // 通用提取：如果有复杂 HTML 结构，返回 innerHTML
    if (tempDiv.querySelector('p, div, span, pre, code, table, ul, ol')) {
      return tempDiv.innerHTML;
    }

    // 否则返回纯文本
    return tempDiv.textContent || tempDiv.innerText || null;
  }

  /**
   * 用特殊注释标记包裹已渲染的数学公式，便于后续处理
   */
  private wrapRenderedMath(container: HTMLElement) {
    const mathSelectors = [
      '.katex-display',
      '.katex:not(.katex-display .katex)',
      '.MathJax_Display',
      '.MathJax:not(.MathJax_Display .MathJax)',
      'mjx-container'
    ];

    mathSelectors.forEach(selector => {
      container.querySelectorAll(selector).forEach(mathEl => {
        // 避免重复包裹
        if (mathEl.parentElement?.classList.contains('ai-paste-math-wrapper')) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'ai-paste-math-wrapper';
        // 使用注释标记，便于 markdown-converter 识别
        const mathHtml = mathEl.outerHTML;
        wrapper.innerHTML = `<!--RENDERED_MATH_START-->${mathHtml}<!--RENDERED_MATH_END-->`;
        mathEl.replaceWith(wrapper);
      });
    });
  }
}
