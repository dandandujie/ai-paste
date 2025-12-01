/**
 * Floating Panel - 复制后自动弹出的格式设置面板
 */
import { convertMarkdown } from '@/lib/markdown-converter';
import { applyStyles } from '@/lib/style-applier';
import { buildClipboardItem } from '@/lib/math-clipboard';
import { getCurrentPreset, getSettings } from '@/utils/storage';
import type { StylePreset } from '@/types';

export class FloatingPanel {
  private panel: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private currentContent: string = '';
  private currentPreset: StylePreset | null = null;
  private onCopyCallback: ((html: string, text: string) => void) | null = null;

  async show(content: string, onCopy: (html: string, text: string) => void) {
    this.currentContent = content;
    this.onCopyCallback = onCopy;
    this.currentPreset = await getCurrentPreset();

    if (this.panel) {
      this.updatePreview();
      this.panel.style.display = 'block';
      return;
    }

    this.createPanel();
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

    // 尝试读取剪贴板内容
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        this.currentContent = text;
      }
    } catch {
      // 剪贴板读取失败，使用空内容
      this.currentContent = '';
    }

    if (this.panel) {
      this.updatePreview();
      this.panel.style.display = 'block';
      return;
    }

    this.createPanel();
    this.updatePreview();
  }

  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.shadowRoot = null;
    }
  }

  private createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'ai-paste-floating-panel';
    this.shadowRoot = this.panel.attachShadow({ mode: 'closed' });

    const settings = this.currentPreset;
    const fontFamily = settings?.body.fontFamily || '微软雅黑, Arial, sans-serif';
    const fontSize = settings?.body.fontSize || '12pt';
    const lineHeight = settings?.body.lineHeight || '1.6';

    // 加载 KaTeX CSS 用于数学公式渲染
    // 需要将相对字体路径替换为绝对路径，否则在 Shadow DOM 中无法正确加载
    const katexFontsUrl = chrome.runtime.getURL('vendor/katex/fonts/');
    const katexStyleElement = document.createElement('style');
    katexStyleElement.id = 'katex-styles';

    // 异步加载并处理 KaTeX CSS
    this.loadKatexCss(katexStyleElement, katexFontsUrl);

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
                  <option value="宋体, SimSun, serif" ${fontFamily.includes('宋体') ? 'selected' : ''}>宋体</option>
                  <option value="黑体, SimHei, sans-serif" ${fontFamily.includes('黑体') ? 'selected' : ''}>黑体</option>
                  <option value="楷体, KaiTi, serif" ${fontFamily.includes('楷体') ? 'selected' : ''}>楷体</option>
                  <option value="Arial, sans-serif" ${fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                  <option value="Times New Roman, serif" ${fontFamily.includes('Times') ? 'selected' : ''}>Times New Roman</option>
                </select>
              </div>
              <div class="format-item">
                <label>字号</label>
                <select id="fontSize" class="format-select">
                  <option value="10pt" ${fontSize === '10pt' ? 'selected' : ''}>10pt</option>
                  <option value="10.5pt" ${fontSize === '10.5pt' ? 'selected' : ''}>10.5pt</option>
                  <option value="12pt" ${fontSize === '12pt' ? 'selected' : ''}>12pt</option>
                  <option value="14pt" ${fontSize === '14pt' ? 'selected' : ''}>14pt</option>
                  <option value="16pt" ${fontSize === '16pt' ? 'selected' : ''}>16pt</option>
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
          </div>
          <div class="preview-section">
            <div class="preview-label">预览</div>
            <div id="previewArea" class="preview-area"></div>
          </div>
        </div>
        <div class="panel-footer">
          <button class="btn btn-primary" id="btnCopy">复制格式化内容</button>
          <button class="btn btn-secondary" id="btnCancel">取消</button>
        </div>
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
    const btnCancel = this.shadowRoot.querySelector('#btnCancel');
    const fontFamily = this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement;
    const fontSize = this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement;
    const lineHeight = this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement;

    btnClose?.addEventListener('click', () => this.hide());
    btnCancel?.addEventListener('click', () => this.hide());

    btnCopy?.addEventListener('click', async () => {
      await this.copyFormatted();
    });

    [fontFamily, fontSize, lineHeight].forEach(select => {
      select?.addEventListener('change', () => this.updatePreview());
    });
  }

  private async updatePreview() {
    if (!this.shadowRoot || !this.currentPreset) return;

    const previewArea = this.shadowRoot.querySelector('#previewArea') as HTMLElement;
    const fontFamily = (this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement)?.value;
    const fontSize = (this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement)?.value;
    const lineHeight = (this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement)?.value;

    if (!previewArea) return;

    try {
      // 统一走 markdown 转换，确保与剪贴板路径一致（保留/还原公式占位）
      const previewHtml = await convertMarkdown(this.currentContent, false);

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

    const fontFamily = (this.shadowRoot.querySelector('#fontFamily') as HTMLSelectElement)?.value;
    const fontSize = (this.shadowRoot.querySelector('#fontSize') as HTMLSelectElement)?.value;
    const lineHeight = (this.shadowRoot.querySelector('#lineHeight') as HTMLSelectElement)?.value;

    try {
      console.log('[AI-Paste] Converting content:', this.currentContent.substring(0, 200));

      // 剪贴板路径统一使用 markdown 转换（含公式占位处理）
      const clipboardHtml = await convertMarkdown(this.currentContent, true);
      console.log('[AI-Paste] Converted HTML:', clipboardHtml.substring(0, 500));

      const tempPreset: StylePreset = {
        ...this.currentPreset,
        body: {
          ...this.currentPreset.body,
          fontFamily,
          fontSize,
          lineHeight
        }
      };

      const styledHtml = applyStyles(clipboardHtml, tempPreset);
      console.log('[AI-Paste] Styled HTML:', styledHtml.substring(0, 500));

      // 如果有回调则使用回调，否则直接写入剪贴板
      if (this.onCopyCallback) {
        this.onCopyCallback(styledHtml, this.currentContent);
      } else {
        // 直接写入剪贴板
        const clipboardItem = buildClipboardItem(styledHtml, this.currentContent);
        await navigator.clipboard.write([clipboardItem]);
        console.log('[AI-Paste] Clipboard write success');
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
      // 将相对字体路径替换为绝对路径
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
        width: 380px;
        max-height: 500px;
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
        max-height: 350px;
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

      .preview-section {
        border-top: 1px solid #eee;
        padding-top: 12px;
      }

      .preview-label {
        font-size: 11px;
        color: #666;
        margin-bottom: 8px;
      }

      .preview-area {
        min-height: 100px;
        max-height: 180px;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid #eee;
        border-radius: 6px;
        background: #fafafa;
        word-wrap: break-word;
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

      /* KaTeX 公式样式 - 确保不被覆盖 */
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
        gap: 10px;
        padding: 12px 16px;
        border-top: 1px solid #eee;
        background: #fafafa;
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

      .btn:disabled {
        background: #9ca3af;
        color: #e5e7eb;
        cursor: not-allowed;
      }

      .btn:disabled:hover {
        background: #9ca3af;
      }

      .error {
        color: #ef4444;
        text-align: center;
        padding: 20px;
      }

      /* Toast 样式 */
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

      /* KaTeX 样式 */
      .katex-display {
        margin: 0.5em 0;
        text-align: center;
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
