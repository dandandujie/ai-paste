/**
 * Floating Panel - 复制后自动弹出的格式设置面板
 * 支持选中文本单独设置字体和字号
 */
import { convertMarkdown } from '@/lib/markdown-converter';
import { buildClipboardItem } from '@/lib/math-clipboard';
import { getCurrentPreset, getSettings, saveSettings } from '@/utils/storage';
import type { StylePreset } from '@/types';

export class FloatingPanel {
  private panel: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private currentContent: string = '';
  private currentPreset: StylePreset | null = null;
  private onCopyCallback: ((html: string, text: string) => void) | null = null;
  private hasSelection: boolean = false;
  private markedRanges: { start: Node; startOffset: number; end: Node; endOffset: number }[] = [];
  private savedRange: Range | null = null;
  private resizeCleanup: (() => void) | null = null;

  async show(content: string, onCopy: (html: string, text: string) => void) {
    this.currentContent = content;
    this.onCopyCallback = onCopy;
    this.currentPreset = await getCurrentPreset();

    if (this.panel) {
      this.resetPreviewArea();
      this.updatePreview();
      this.panel.style.display = 'block';
      return;
    }

    await this.createPanel();
    this.updatePreview();
  }

  async toggle() {
    if (this.panel && this.panel.style.display !== 'none') {
      this.hide();
    } else {
      await this.showWithClipboard();
    }
  }

  private async showWithClipboard() {
    this.currentPreset = await getCurrentPreset();

    try {
      // 优先尝试读取 HTML 格式
      const content = await this.readClipboardContent();
      if (content && content.trim()) {
        this.currentContent = content;
      }
    } catch {
      this.currentContent = '';
    }

    if (this.panel) {
      this.resetPreviewArea();
      this.updatePreview();
      this.panel.style.display = 'block';
      return;
    }

    await this.createPanel();
    this.updatePreview();
  }

  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  destroy() {
    this.resizeCleanup?.();
    this.resizeCleanup = null;
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.shadowRoot = null;
    }
  }

  private async createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'ai-paste-floating-panel';
    this.shadowRoot = this.panel.attachShadow({ mode: 'open' });

    const settings = this.currentPreset;
    const fontFamily = settings?.body.fontFamily || '微软雅黑, Arial, sans-serif';
    const fontSize = settings?.body.fontSize || '12pt';
    const lineHeight = settings?.body.lineHeight || '1.6';

    const katexFontsUrl = chrome.runtime.getURL('vendor/katex/fonts/');
    const katexStyleElement = document.createElement('style');
    katexStyleElement.id = 'katex-styles';
    // 等待 KaTeX CSS 加载完成，避免 Windows 端因文件 I/O 较慢导致公式渲染失败
    await this.loadKatexCss(katexStyleElement, katexFontsUrl);

    const styleElement = document.createElement('style');
    styleElement.textContent = this.getStyles();

    this.shadowRoot.appendChild(katexStyleElement);
    this.shadowRoot.appendChild(styleElement);

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="panel-container">
        <div class="panel-header">
          <span class="panel-title">AI-Paste 格式转换</span>
          <button class="btn-close" title="关闭">×</button>
        </div>
        <div class="panel-body">
          <div class="format-section">
            <div class="format-row">
              <div class="format-item">
                <label>字体</label>
                <select id="fontFamily" class="format-select">
                  <option value="微软雅黑, Arial, sans-serif" ${fontFamily.includes('微软雅黑') ? 'selected' : ''}>微软雅黑</option>
                  <option value="宋体, SimSun, serif" ${fontFamily.includes('宋体') && !fontFamily.includes('仿宋') ? 'selected' : ''}>宋体</option>
                  <option value="仿宋, FangSong, serif" ${fontFamily.includes('仿宋') ? 'selected' : ''}>仿宋</option>
                  <option value="黑体, SimHei, sans-serif" ${fontFamily.includes('黑体') ? 'selected' : ''}>黑体</option>
                  <option value="楷体, KaiTi, serif" ${fontFamily.includes('楷体') ? 'selected' : ''}>楷体</option>
                  <option value="Arial, sans-serif" ${fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                  <option value="Times New Roman, serif" ${fontFamily.includes('Times') ? 'selected' : ''}>Times New Roman</option>
                </select>
              </div>
              <div class="format-item">
                <label>字号</label>
                <select id="fontSize" class="format-select">
                  <option value="42pt" ${fontSize === '42pt' ? 'selected' : ''}>初号</option>
                  <option value="36pt" ${fontSize === '36pt' ? 'selected' : ''}>小初</option>
                  <option value="26pt" ${fontSize === '26pt' ? 'selected' : ''}>一号</option>
                  <option value="24pt" ${fontSize === '24pt' ? 'selected' : ''}>小一</option>
                  <option value="22pt" ${fontSize === '22pt' ? 'selected' : ''}>二号</option>
                  <option value="18pt" ${fontSize === '18pt' ? 'selected' : ''}>小二</option>
                  <option value="16pt" ${fontSize === '16pt' ? 'selected' : ''}>三号</option>
                  <option value="15pt" ${fontSize === '15pt' ? 'selected' : ''}>小三</option>
                  <option value="14pt" ${fontSize === '14pt' ? 'selected' : ''}>四号</option>
                  <option value="12pt" ${fontSize === '12pt' ? 'selected' : ''}>小四</option>
                  <option value="10.5pt" ${fontSize === '10.5pt' ? 'selected' : ''}>五号</option>
                  <option value="9pt" ${fontSize === '9pt' ? 'selected' : ''}>小五</option>
                  <option value="7.5pt" ${fontSize === '7.5pt' ? 'selected' : ''}>六号</option>
                  <option value="6.5pt" ${fontSize === '6.5pt' ? 'selected' : ''}>小六</option>
                  <option value="5.5pt" ${fontSize === '5.5pt' ? 'selected' : ''}>七号</option>
                  <option value="5pt" ${fontSize === '5pt' ? 'selected' : ''}>八号</option>
                </select>
              </div>
              <div class="format-item">
                <label>行距</label>
                <select id="lineHeight" class="format-select">
                  <option value="1.0" ${lineHeight === '1.0' ? 'selected' : ''}>单倍</option>
                  <option value="1.5" ${lineHeight === '1.5' ? 'selected' : ''}>1.5倍</option>
                  <option value="1.6" ${lineHeight === '1.6' ? 'selected' : ''}>1.6倍</option>
                  <option value="2.0" ${lineHeight === '2.0' ? 'selected' : ''}>双倍</option>
                </select>
              </div>
            </div>
            <div class="format-hint" id="formatHint">
              <span class="hint-icon">💡</span>
              <span>选中预览区文本可单独设置格式</span>
            </div>
            <div class="selection-toolbar" id="selectionToolbar">
              <span class="toolbar-label">选中文本:</span>
              <button class="toolbar-btn" id="markSelection" title="标记选中内容（可多次标记）">+标记</button>
              <button class="toolbar-btn" id="applyFont" title="应用字体到所有标记">应用字体</button>
              <button class="toolbar-btn" id="applySize" title="应用字号到所有标记">应用字号</button>
              <button class="toolbar-btn" id="applyBoth" title="应用字体和字号到所有标记">全部应用</button>
              <button class="toolbar-btn btn-clear" id="clearMarks" title="清除所有标记">清除</button>
            </div>
            <div class="mark-count" id="markCount"></div>
          </div>
          <div class="preview-section">
            <div class="preview-label">预览 <span class="preview-tip">（可选中文本单独设置格式）</span></div>
            <div id="previewArea" class="preview-area" contenteditable="true"></div>
          </div>
        </div>
        <div class="panel-footer">
          <div class="footer-row">
            <button class="btn btn-secondary" id="btnReset">重置格式</button>
            <button class="btn btn-primary" id="btnCopy">复制格式化内容</button>
          </div>
          <div class="auto-popup-toggle">
            <label class="toggle-label">
              <input type="checkbox" id="autoPopupToggle" checked>
              <span class="toggle-slider"></span>
              <span class="toggle-text">启用浮窗</span>
            </label>
          </div>
        </div>
        <div class="resize-handle" id="resizeHandle"></div>
      </div>
    `;

    this.shadowRoot.appendChild(container);
    document.body.appendChild(this.panel);
    this.bindEvents();
  }

  private bindEvents() {
    if (!this.shadowRoot) return;

    const btnClose = this.shadowRoot.querySelector('.btn-close');
    const btnCopy = this.shadowRoot.querySelector('#btnCopy');
    const btnReset = this.shadowRoot.querySelector('#btnReset');
    const fontFamily = this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement;
    const fontSize = this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement;
    const lineHeight = this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement;
    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;
    const applyFont = this.shadowRoot.querySelector('#applyFont');
    const applySize = this.shadowRoot.querySelector('#applySize');
    const applyBoth = this.shadowRoot.querySelector('#applyBoth');
    const markSelection = this.shadowRoot.querySelector('#markSelection');
    const clearMarks = this.shadowRoot.querySelector('#clearMarks');
    const resizeHandle = this.shadowRoot.querySelector('#resizeHandle') as HTMLElement;

    btnClose?.addEventListener('click', () => this.hide());

    btnReset?.addEventListener('click', () => {
      // 重置为默认格式：宋体、小四(12pt)、1.5倍行距
      if (fontFamily) fontFamily.value = '宋体, SimSun, serif';
      if (fontSize) fontSize.value = '12pt';
      if (lineHeight) lineHeight.value = '1.5';

      this.resetPreviewArea();
      this.updatePreview();

      this.showToast('已重置为默认格式', 'success');
    });

    btnCopy?.addEventListener('click', async () => {
      await this.copyFormatted();
    });

    // 全局格式改变时，如果没有选中文本，则应用到整个预览区
    [fontFamily, fontSize, lineHeight].forEach(select => {
      select?.addEventListener('change', () => {
        if (!this.hasSelection && this.markedRanges.length === 0) {
          this.applyGlobalStyle();
        }
      });
    });

    // 监听预览区的选择变化
    if (previewArea) {
      this.bindPreviewEvents(previewArea);
    }

    // 标记和应用按钮
    markSelection?.addEventListener('click', () => this.markCurrentSelection());
    clearMarks?.addEventListener('click', () => this.clearAllMarks());
    applyFont?.addEventListener('click', () => this.applyToMarkedOrSelection('font'));
    applySize?.addEventListener('click', () => this.applyToMarkedOrSelection('size'));
    applyBoth?.addEventListener('click', () => this.applyToMarkedOrSelection('both'));

    // 调整大小
    this.setupResize(resizeHandle);

    // 自动弹出开关
    this.setupAutoPopupToggle();
  }

  /**
   * 绑定预览区事件监听器
   */
  private bindPreviewEvents(previewArea: HTMLElement) {
    previewArea.addEventListener('mouseup', () => this.checkSelection());
    previewArea.addEventListener('keyup', () => this.checkSelection());
  }

  /**
   * 重置预览区元素，清除 contenteditable 的内部状态
   * 解决 KaTeX 公式在第二次复制时被碎片化的问题
   */
  private resetPreviewArea() {
    if (!this.shadowRoot) return;

    const oldPreview = this.shadowRoot.querySelector('#previewArea') as HTMLElement | null;
    if (!oldPreview) return;

    // 浅克隆元素（保留 id, class, contenteditable 属性，丢弃内部编辑状态）
    const newPreview = oldPreview.cloneNode(false) as HTMLElement;

    // 重新绑定事件监听器（cloneNode 不复制事件）
    this.bindPreviewEvents(newPreview);

    // 清除类内部状态
    this.markedRanges = [];
    this.savedRange = null;
    this.hasSelection = false;

    // 清除浏览器选区状态
    const root = this.shadowRoot as ShadowRoot & { getSelection?: () => Selection | null };
    const selection = root.getSelection ? root.getSelection() : document.getSelection();
    selection?.removeAllRanges();

    // 替换元素
    oldPreview.replaceWith(newPreview);

    // 重置 UI 状态
    this.updateMarkCount();
    const selectionToolbar = this.shadowRoot.querySelector('#selectionToolbar') as HTMLElement;
    const formatHint = this.shadowRoot.querySelector('#formatHint') as HTMLElement;
    selectionToolbar?.classList.remove('show');
    formatHint?.classList.remove('hide');
  }

  private setupResize(handle: HTMLElement) {
    if (!handle || !this.shadowRoot) return;

    const panelContainer = this.shadowRoot.querySelector('.panel-container') as HTMLElement;
    if (!panelContainer) return;

    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = panelContainer.offsetWidth;
      startHeight = panelContainer.offsetHeight;
      e.preventDefault();
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = startWidth - (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);

      if (newWidth >= 320 && newWidth <= 800) {
        panelContainer.style.width = newWidth + 'px';
      }
      if (newHeight >= 300 && newHeight <= 800) {
        panelContainer.style.maxHeight = newHeight + 'px';
      }
    };

    const onMouseUp = () => {
      isResizing = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    this.resizeCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  private async setupAutoPopupToggle() {
    if (!this.shadowRoot) return;

    const toggle = this.shadowRoot.querySelector('#autoPopupToggle') as HTMLInputElement;
    if (!toggle) return;

    // 初始化开关状态
    const settings = await getSettings();
    toggle.checked = settings.showFloatingPanel;

    // 监听开关变化
    toggle.addEventListener('change', async () => {
      const settings = await getSettings();
      settings.showFloatingPanel = toggle.checked;
      await saveSettings(settings);
      this.showToast(toggle.checked ? '浮窗已启用' : '浮窗已关闭', 'success');
    });
  }

  private checkSelection() {
    if (!this.shadowRoot) return;

    // 尝试从 shadowRoot 获取 selection（Chrome 支持）
    const root = this.shadowRoot as ShadowRoot & { getSelection?: () => Selection | null };
    const selection = root.getSelection ? root.getSelection() : document.getSelection();

    const selectionToolbar = this.shadowRoot.querySelector('#selectionToolbar') as HTMLElement;
    const formatHint = this.shadowRoot.querySelector('#formatHint') as HTMLElement;
    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;

    // 检查选择是否在预览区内
    let isInPreview = false;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      isInPreview = previewArea?.contains(range.commonAncestorContainer) || false;

      // 保存选择范围，以便点击按钮时使用
      if (isInPreview && !selection.isCollapsed) {
        this.savedRange = range.cloneRange();
      }
    }

    const hasValidSelection = selection && !selection.isCollapsed && selection.toString().trim() && isInPreview;

    if (hasValidSelection) {
      this.hasSelection = true;
      this.savedRange = selection!.getRangeAt(0).cloneRange();
    } else {
      this.hasSelection = false;
    }

    // 有选中文本或有标记时，显示工具栏
    if (hasValidSelection || this.markedRanges.length > 0) {
      selectionToolbar.classList.add('show');
      formatHint.classList.add('hide');
    } else {
      selectionToolbar.classList.remove('show');
      formatHint.classList.remove('hide');
    }
  }

  private markCurrentSelection() {
    if (!this.shadowRoot) return;

    // 使用保存的范围
    if (!this.savedRange) {
      this.showToast('请先选中文本', 'error');
      return;
    }

    const range = this.savedRange;

    // 用高亮 span 包裹选中内容
    const mark = document.createElement('span');
    mark.className = 'ai-paste-mark';
    mark.setAttribute('data-mark-id', String(this.markedRanges.length));

    try {
      const content = range.extractContents();
      mark.appendChild(content);
      range.insertNode(mark);

      this.markedRanges.push({
        start: mark,
        startOffset: 0,
        end: mark,
        endOffset: mark.childNodes.length
      });

      this.savedRange = null;
      this.hasSelection = false;
      this.updateMarkCount();
      this.showToast(`已标记 ${this.markedRanges.length} 处`, 'success');

      // 标记后保持工具栏显示（方便继续选择其他文本）
    } catch (e) {
      console.error('[AI-Paste] Mark error:', e);
      this.showToast('标记失败', 'error');
    }
  }

  private clearAllMarks() {
    if (!this.shadowRoot) return;

    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;
    const marks = previewArea.querySelectorAll('.ai-paste-mark');

    marks.forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      parent?.removeChild(mark);
    });

    this.markedRanges = [];
    this.updateMarkCount();
    this.showToast('已清除所有标记', 'success');
  }

  private updateMarkCount() {
    if (!this.shadowRoot) return;
    const markCount = this.shadowRoot.querySelector('#markCount') as HTMLElement;
    if (markCount) {
      if (this.markedRanges.length > 0) {
        markCount.textContent = `已标记 ${this.markedRanges.length} 处文本`;
        markCount.style.display = 'block';
      } else {
        markCount.style.display = 'none';
      }
    }
  }

  private applyToMarkedOrSelection(type: 'font' | 'size' | 'both') {
    if (!this.shadowRoot) return;

    const fontFamily = (this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement)?.value;
    const fontSize = (this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement)?.value;
    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;

    // 如果有标记的文本，应用到所有标记
    if (this.markedRanges.length > 0) {
      const marks = previewArea.querySelectorAll('.ai-paste-mark');
      const count = marks.length;

      marks.forEach(mark => {
        const el = mark as HTMLElement;
        // 应用格式
        if (type === 'font' || type === 'both') {
          el.style.fontFamily = fontFamily;
        }
        if (type === 'size' || type === 'both') {
          el.style.fontSize = fontSize;
        }

        // 移除标记类但保留格式（去掉黄色背景）
        el.classList.remove('ai-paste-mark');
        el.removeAttribute('data-mark-id');
      });

      // 清空标记数组，允许用户继续标记其他内容
      this.markedRanges = [];
      this.updateMarkCount();

      // 隐藏工具栏
      const selectionToolbar = this.shadowRoot.querySelector('#selectionToolbar') as HTMLElement;
      const formatHint = this.shadowRoot.querySelector('#formatHint') as HTMLElement;
      selectionToolbar?.classList.remove('show');
      formatHint?.classList.remove('hide');

      this.showToast(`已应用到 ${count} 处，可继续标记其他内容`, 'success');
      return;
    }

    // 否则应用到当前选中（使用保存的范围）
    if (!this.savedRange) {
      this.showToast('请先选中文本', 'error');
      return;
    }

    try {
      const range = this.savedRange;
      const selectedContent = range.extractContents();

      const span = document.createElement('span');
      if (type === 'font' || type === 'both') {
        span.style.fontFamily = fontFamily;
      }
      if (type === 'size' || type === 'both') {
        span.style.fontSize = fontSize;
      }
      span.appendChild(selectedContent);
      range.insertNode(span);

      this.savedRange = null;
      this.hasSelection = false;

      const selectionToolbar = this.shadowRoot.querySelector('#selectionToolbar') as HTMLElement;
      const formatHint = this.shadowRoot.querySelector('#formatHint') as HTMLElement;
      selectionToolbar?.classList.remove('show');
      formatHint?.classList.remove('hide');

      this.showToast('格式已应用', 'success');
    } catch (e) {
      console.error('[AI-Paste] Apply error:', e);
      this.showToast('应用失败', 'error');
    }
  }

  private applyGlobalStyle() {
    if (!this.shadowRoot) return;

    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;
    const fontFamily = (this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement)?.value;
    const fontSize = (this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement)?.value;
    const lineHeight = (this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement)?.value;

    if (previewArea) {
      previewArea.style.fontFamily = fontFamily;
      previewArea.style.fontSize = fontSize;
      previewArea.style.lineHeight = lineHeight;
    }
  }

  /**
   * 读取剪贴板内容，优先尝试 HTML 格式
   */
  private async readClipboardContent(): Promise<string> {
    try {
      // 尝试使用 Clipboard API 读取 HTML
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          // 检查 HTML 是否包含数学公式
          if (html && this.containsMathElements(html)) {
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
   * 检测 HTML 是否包含数学公式元素
   */
  private containsMathElements(html: string): boolean {
    // 支持双引号和单引号属性，以及各种数学公式标记
    return /class=["']?katex|class=["']?MathJax|<mjx-container|<math[\s>]|data-latex=|<!--RENDERED_MATH_START-->/i.test(html);
  }

  /**
   * 在 HTML 字符串中包裹已渲染的数学公式
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
        const mathHtml = mathEl.outerHTML;
        wrapper.innerHTML = `<!--RENDERED_MATH_START-->${mathHtml}<!--RENDERED_MATH_END-->`;
        mathEl.replaceWith(wrapper);
      });
    });

    return tempDiv.innerHTML;
  }

  /**
   * 检测内容是否为 HTML（包含已渲染的数学公式）
   */
  private isHtmlContent(content: string): boolean {
    // 检查是否包含 HTML 标签
    if (!/<[a-z][\s\S]*>/i.test(content)) {
      return false;
    }
    // 检查是否包含已渲染的数学公式标记或 KaTeX/MathJax 元素
    return this.containsMathElements(content);
  }

  private async updatePreview() {
    if (!this.shadowRoot || !this.currentPreset) return;

    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;
    const fontFamily = (this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement)?.value;
    const fontSize = (this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement)?.value;
    const lineHeight = (this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement)?.value;

    if (!previewArea) return;

    try {
      let previewHtml: string;

      if (this.isHtmlContent(this.currentContent)) {
        // 内容已经是 HTML（包含已渲染的公式），直接使用
        // 移除注释标记，保留公式 HTML
        previewHtml = this.currentContent
          .replace(/<!--RENDERED_MATH_START-->/g, '')
          .replace(/<!--RENDERED_MATH_END-->/g, '');
      } else {
        // 内容是 Markdown，需要转换
        previewHtml = await convertMarkdown(this.currentContent, false);
      }

      previewArea.innerHTML = previewHtml;
      previewArea.style.fontFamily = fontFamily;
      previewArea.style.fontSize = fontSize;
      previewArea.style.lineHeight = lineHeight;
    } catch (error) {
      console.error('[AI-Paste] Preview error:', error);
      previewArea.innerHTML = '<div class="error">预览生成失败</div>';
    }
  }

  private async copyFormatted() {
    if (!this.shadowRoot || !this.currentPreset) return;

    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;
    const fontFamily = (this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement)?.value;
    const fontSize = (this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement)?.value;
    const lineHeight = (this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement)?.value;

    try {
      let finalHtml: string;

      if (this.isHtmlContent(this.currentContent)) {
        // 内容是 HTML（包含已渲染的公式），使用 convertHtmlForClipboard 转换
        const { convertHtmlForClipboard } = await import('@/lib/markdown-converter');
        finalHtml = convertHtmlForClipboard(this.currentContent);
      } else {
        // 内容是 Markdown，使用 convertMarkdown 转换
        finalHtml = await convertMarkdown(this.currentContent, true);
      }

      // 应用用户选择的格式
      finalHtml = `<div style="font-family: ${fontFamily}; font-size: ${fontSize}; line-height: ${lineHeight};">${finalHtml}</div>`;

      const plainText = previewArea.innerText || this.currentContent;

      if (this.onCopyCallback) {
        this.onCopyCallback(finalHtml, plainText);
      } else {
        const clipboardItem = buildClipboardItem(finalHtml, plainText);
        await navigator.clipboard.write([clipboardItem]);
        this.showToast('已复制到剪贴板', 'success');
      }

      this.hide();
    } catch (error) {
      console.error('[AI-Paste] Copy error:', error);
      this.showToast('复制失败', 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    if (!this.shadowRoot) return;
    let toast = this.shadowRoot.querySelector('.toast') as HTMLElement;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      this.shadowRoot.querySelector('.panel-container')?.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  private async loadKatexCss(styleElement: HTMLStyleElement, fontsBaseUrl: string) {
    try {
      const katexCssUrl = chrome.runtime.getURL('vendor/katex/katex.min.css');
      const response = await fetch(katexCssUrl);
      let cssText = await response.text();
      cssText = cssText.replace(/url\(fonts\//g, `url(${fontsBaseUrl}`);
      styleElement.textContent = cssText;
    } catch (error) {
      console.error('[AI-Paste] Failed to load KaTeX CSS:', error);
    }
  }

  private getStyles(): string {
    return `
      :host {
        all: initial;
      }

      .panel-container {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 420px;
        max-height: 550px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #333;
        z-index: 2147483647;
        overflow: hidden;
        animation: slideIn 0.25s ease;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
      }

      .panel-title {
        font-weight: 600;
        font-size: 14px;
      }

      .btn-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.8;
      }

      .btn-close:hover {
        opacity: 1;
      }

      .panel-body {
        padding: 12px 16px;
        max-height: 400px;
        overflow-y: auto;
      }

      .format-section {
        margin-bottom: 12px;
      }

      .format-row {
        display: flex;
        gap: 10px;
      }

      .format-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .format-item label {
        font-size: 11px;
        color: #666;
      }

      .format-select {
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        background: #fff;
        cursor: pointer;
      }

      .format-select:focus {
        outline: none;
        border-color: #6366f1;
      }

      .format-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        padding: 8px 10px;
        background: #f0f9ff;
        border-radius: 6px;
        font-size: 12px;
        color: #0369a1;
        transition: opacity 0.2s, height 0.2s;
      }

      .format-hint.hide {
        opacity: 0;
        height: 0;
        padding: 0;
        margin: 0;
        overflow: hidden;
      }

      .hint-icon {
        font-size: 14px;
      }

      .selection-toolbar {
        display: none;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding: 8px 10px;
        background: #fef3c7;
        border-radius: 6px;
        font-size: 12px;
      }

      .selection-toolbar.show {
        display: flex;
      }

      .toolbar-label {
        color: #92400e;
        font-weight: 500;
      }

      .toolbar-btn {
        padding: 4px 10px;
        border: 1px solid #d97706;
        border-radius: 4px;
        background: #fff;
        color: #d97706;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .toolbar-btn:hover {
        background: #d97706;
        color: #fff;
      }

      .preview-section {
        border-top: 1px solid #eee;
        padding-top: 12px;
      }

      .preview-label {
        font-size: 11px;
        color: #666;
        margin-bottom: 8px;
      }

      .preview-tip {
        color: #9ca3af;
        font-size: 10px;
      }

      .preview-area {
        min-height: 120px;
        max-height: 200px;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #fff;
        word-wrap: break-word;
        cursor: text;
      }

      .preview-area:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
      }

      .preview-area::selection {
        background: #c7d2fe;
      }

      .preview-area h1, .preview-area h2, .preview-area h3 {
        margin: 0.5em 0;
      }

      .preview-area p {
        margin: 0.5em 0;
      }

      .preview-area pre {
        background: #f0f0f0;
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 11px;
      }

      .preview-area code {
        font-family: Consolas, Monaco, monospace;
      }

      .preview-area .katex {
        font-size: 1em !important;
        line-height: normal !important;
      }

      .preview-area .katex-display {
        margin: 1em 0 !important;
        text-align: center;
      }

      .preview-area .katex .base {
        display: inline-block;
      }

      .panel-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px 16px;
        border-top: 1px solid #eee;
        background: #fafafa;
      }

      .footer-row {
        display: flex;
        gap: 10px;
      }

      .btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #4f46e5;
        color: white;
      }

      .btn-primary:hover {
        background: #4338ca;
      }

      .btn-secondary {
        background: #e5e7eb;
        color: #374151;
      }

      .btn-secondary:hover {
        background: #d1d5db;
      }

      .error {
        color: #ef4444;
        text-align: center;
        padding: 20px;
      }

      .toast {
        position: absolute;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 10;
        pointer-events: none;
      }

      .toast.show {
        opacity: 1;
      }

      .toast.success {
        background: #22c55e;
        color: white;
      }

      .toast.error {
        background: #ef4444;
        color: white;
      }

      .katex-display {
        margin: 0.5em 0;
        text-align: center;
      }

      /* 调整大小手柄 */
      .resize-handle {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 16px;
        height: 16px;
        cursor: sw-resize;
        background: linear-gradient(135deg, transparent 50%, #d1d5db 50%);
        border-radius: 0 0 0 12px;
      }

      .resize-handle:hover {
        background: linear-gradient(135deg, transparent 50%, #9ca3af 50%);
      }

      /* 标记样式 */
      .ai-paste-mark {
        background-color: #fef08a;
        border-radius: 2px;
        padding: 0 2px;
      }

      .mark-count {
        display: none;
        margin-top: 8px;
        padding: 6px 10px;
        background: #ecfdf5;
        border-radius: 4px;
        font-size: 11px;
        color: #059669;
      }

      .btn-clear {
        border-color: #dc2626 !important;
        color: #dc2626 !important;
      }

      .btn-clear:hover {
        background: #dc2626 !important;
        color: #fff !important;
      }

      .selection-toolbar {
        flex-wrap: wrap;
      }

      /* 自动弹出开关 */
      .auto-popup-toggle {
        display: flex;
        justify-content: center;
        padding-top: 4px;
        border-top: 1px dashed #e5e7eb;
      }

      .toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }

      .toggle-label input {
        display: none;
      }

      .toggle-slider {
        position: relative;
        width: 36px;
        height: 20px;
        background: #d1d5db;
        border-radius: 10px;
        transition: background 0.2s;
      }

      .toggle-slider::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      .toggle-label input:checked + .toggle-slider {
        background: #4f46e5;
      }

      .toggle-label input:checked + .toggle-slider::after {
        transform: translateX(16px);
      }

      .toggle-text {
        font-size: 12px;
        color: #6b7280;
      }
    `;
  }
}

let floatingPanelInstance: FloatingPanel | null = null;

export function getFloatingPanel(): FloatingPanel {
  if (!floatingPanelInstance) {
    floatingPanelInstance = new FloatingPanel();
  }
  return floatingPanelInstance;
}

export async function shouldShowFloatingPanel(): Promise<boolean> {
  const settings = await getSettings();
  return settings.enabled && (settings as any).showFloatingPanel === true;
}
