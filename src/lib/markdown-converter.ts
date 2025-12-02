import { marked } from 'marked';
import hljs from 'highlight.js';
import { processLatexInText, renderLatex } from './math-renderer';
import { mml2omml } from 'mathml2omml';

marked.setOptions({
  gfm: true,
  breaks: true
});

let forClipboardMode = false;

const renderer = new marked.Renderer();

renderer.code = function (code: string, language: string | undefined) {
  const lang = language || 'plaintext';
  let highlighted: string;

  try {
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch {
    highlighted = escapeHtml(code);
  }

  return `<pre class="code-block" data-language="${lang}"><code class="hljs language-${lang}">${highlighted}</code></pre>`;
};

renderer.table = function (header: string, body: string) {
  return `<table class="md-table" border="1" cellspacing="0" cellpadding="6">
    <thead>${header}</thead>
    <tbody>${body}</tbody>
  </table>`;
};

renderer.listitem = function (text: string) {
  return `<li class="md-list-item">${text}</li>`;
};

renderer.paragraph = function (text: string) {
  const processed = processLatexInText(text, forClipboardMode);
  return `<p class="md-paragraph">${processed}</p>`;
};

renderer.heading = function (text: string, level: number) {
  const processed = processLatexInText(text, forClipboardMode);
  return `<h${level} class="md-heading md-h${level}">${processed}</h${level}>`;
};

renderer.blockquote = function (quote: string) {
  return `<blockquote class="md-blockquote">${quote}</blockquote>`;
};

renderer.link = function (href: string, title: string | null, text: string) {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} class="md-link">${text}</a>`;
};

renderer.image = function (href: string, title: string | null, text: string) {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<img src="${href}" alt="${text}"${titleAttr} class="md-image" style="max-width: 100%;">`;
};

renderer.strong = function (text: string) {
  return `<strong class="md-strong">${text}</strong>`;
};

renderer.em = function (text: string) {
  return `<em class="md-em">${text}</em>`;
};

renderer.codespan = function (code: string) {
  return `<code class="md-code-inline">${escapeHtml(code)}</code>`;
};

renderer.text = function (text: string) {
  return processLatexInText(text, forClipboardMode);
};

marked.use({ renderer });

// 使用不含下划线的占位符，避免被 Markdown 解析器误认为斜体标记
function createMathPlaceholder(index: number): string {
  return `AIPASTEMATH${index}PLACEHOLDER`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// rejoinSplitMathLines 函数已移除（会错误处理包含希腊字母的正常文本）

export async function convertMarkdown(markdown: string, forClipboard: boolean = false): Promise<string> {
  // 预处理0：将 HTML 换行符归一化为普通换行，避免打散 LaTeX 环境匹配
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // 预处理1：合并被拆分的公式行（已禁用，避免误处理正常文本）
  // markdown = rejoinSplitMathLines(markdown);

  // 预处理2：将常见的"裸公式行"包裹为 LaTeX，便于后续统一处理
  markdown = wrapLooseMathLines(markdown);

  // 用于存储所有需要保护的内容
  const mathMap: Map<string, { type: 'rendered' | 'latex-block' | 'latex-inline'; content: string }> = new Map();
  let mathIndex = 0;

  // 保存已渲染的公式 HTML（来自 AI 网站）
  markdown = markdown.replace(/<!--RENDERED_MATH_START-->([\s\S]*?)<!--RENDERED_MATH_END-->/g, (_match, mathHtml) => {
    const placeholder = createMathPlaceholder(mathIndex++);
    mathMap.set(placeholder, { type: 'rendered', content: mathHtml });
    return placeholder;
  });

  // 保护 [...] 块级公式（非标准格式，某些 AI 输出使用）
  // 必须在 \begin{...}\end{...} 之前处理，否则内容会被替换为占位符
  // 匹配：行首 [ + 换行 + 内容 + 换行 + ] 行尾
  markdown = markdown.replace(/^\[\s*\n([\s\S]+?)\n\s*\]$/gm, (_match, content) => {
    // 检查内容是否包含 LaTeX 特征
    if (/\\[a-zA-Z]+|[_^]/.test(content)) {
      const placeholder = createMathPlaceholder(mathIndex++);
      mathMap.set(placeholder, { type: 'latex-block', content: content.trim() });
      return placeholder;
    }
    return _match;
  });

  // 保护 \begin{...}\end{...} LaTeX 环境（如 align*, equation, matrix 等）
  markdown = markdown.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]+?)\\end\{\1\}/g, (_match, env, body) => {
    const placeholder = createMathPlaceholder(mathIndex++);
    const inner = body.trim();
    const latex = `\\begin{${env}}\n${inner}\n\\end{${env}}`;
    mathMap.set(placeholder, { type: 'latex-block', content: latex });
    return placeholder;
  });

  // 保护 \[...\] 块级公式，避免被 Markdown 解析器转义
  // 匹配 反斜杠+左方括号 ... 反斜杠+右方括号
  markdown = markdown.replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (_match, latex) => {
    const placeholder = createMathPlaceholder(mathIndex++);
    mathMap.set(placeholder, { type: 'latex-block', content: latex.trim() });
    return placeholder;
  });

  // 保护 $$...$$ 块级公式
  markdown = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
    const placeholder = createMathPlaceholder(mathIndex++);
    mathMap.set(placeholder, { type: 'latex-block', content: latex.trim() });
    return placeholder;
  });

  // 保护 \(...\) 行内公式 - 匹配反斜杠+括号
  // 使用 .+? 而非 [^)]+? 以支持内容包含括号的公式如 \(N(d_1)\)
  markdown = markdown.replace(/\\\((.+?)\\\)/g, (_match, latex) => {
    const placeholder = createMathPlaceholder(mathIndex++);
    mathMap.set(placeholder, { type: 'latex-inline', content: latex.trim() });
    return placeholder;
  });

  // 保护 $...$ 行内公式（排除 $$）
  markdown = markdown.replace(/\$([^$\n]+?)\$/g, (_match, latex) => {
    const placeholder = createMathPlaceholder(mathIndex++);
    mathMap.set(placeholder, { type: 'latex-inline', content: latex.trim() });
    return placeholder;
  });

  // 保护 (LaTeX表达式) 格式 - AI 输出常见格式
  // 使用基于栈的解析器处理嵌套括号
  markdown = convertSoftParenthesesToLatex(markdown, mathMap, mathIndex);
  // 更新 mathIndex
  mathIndex = mathMap.size;

  forClipboardMode = forClipboard;
  let html = await marked.parse(markdown);
  forClipboardMode = false;

  // 恢复所有公式
  mathMap.forEach((data, placeholder) => {
    let replacement: string;

    if (data.type === 'rendered') {
      replacement = convertPreservedMath(data.content, forClipboard);
    } else {
      const isBlock = data.type === 'latex-block';
      const result = renderLatex(data.content, isBlock);
      replacement = forClipboard ? result.mathml : result.html;
    }

    html = html.split(placeholder).join(replacement);
  });

  return html;
}

/**
 * 处理从剪贴板读取的 HTML，将其中的公式转换为 OMML 格式
 * 用于 popup 页面从 HTML 剪贴板生成 Word 兼容的内容
 */
export function convertHtmlForClipboard(html: string): string {
  // 先移除我们添加的注释标记，保留内部的公式 HTML
  html = html
    .replace(/<!--RENDERED_MATH_START-->/g, '')
    .replace(/<!--RENDERED_MATH_END-->/g, '');

  const div = document.createElement('div');
  div.innerHTML = html;

  // 移除不需要的元素
  div.querySelectorAll('script, style, meta, link').forEach(el => el.remove());

  // 移除我们添加的包装元素，保留内容
  div.querySelectorAll('.ai-paste-math-wrapper').forEach(wrapper => {
    while (wrapper.firstChild) {
      wrapper.parentNode?.insertBefore(wrapper.firstChild, wrapper);
    }
    wrapper.remove();
  });

  // 查找顶层公式容器（避免重复处理嵌套元素）
  // 优先处理带有 display 类的块级公式
  const topLevelMathSelectors = [
    '.katex-display',           // KaTeX 块级公式
    '.MathJax_Display',         // MathJax 块级公式
    'mjx-container[display="true"]', // MathJax 3 块级
    '.katex:not(.katex-display .katex)', // KaTeX 行内公式（排除块级内的）
    '.MathJax:not(.MathJax_Display .MathJax)', // MathJax 行内
    'mjx-container:not([display="true"])', // MathJax 3 行内
  ];

  const processed = new Set<Element>();

  topLevelMathSelectors.forEach(selector => {
    try {
      div.querySelectorAll(selector).forEach(mathEl => {
        // 跳过已处理的元素或其子元素
        if (processed.has(mathEl)) return;

        // 检查是否是另一个已处理元素的子元素
        let parent = mathEl.parentElement;
        while (parent && parent !== div) {
          if (processed.has(parent)) return;
          parent = parent.parentElement;
        }

        const mathHtml = mathEl.outerHTML;
        const isDisplay = mathEl.classList.contains('katex-display') ||
                          mathEl.classList.contains('MathJax_Display') ||
                          mathEl.getAttribute('display') === 'true';

        // 提取 LaTeX 并转换
        const converted = convertPreservedMath(mathHtml, true);

        // 创建替换元素
        const wrapper = document.createElement(isDisplay ? 'div' : 'span');
        wrapper.innerHTML = converted;
        mathEl.replaceWith(wrapper);

        processed.add(mathEl);
      });
    } catch (e) {
      console.warn('[AI-Paste] Selector failed:', selector, e);
    }
  });

  return div.innerHTML;
}

export function extractPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '[代码块]')
    .replace(/`[^`]+`/g, match => match.slice(1, -1))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片: $1]')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 将网页上已渲染的公式转换为目标格式
 * - 预览：保留原始 HTML，便于显示
 * - 剪贴板：提取 LaTeX 后转为 OMML，Windows/Mac Word 原生支持
 */
function convertPreservedMath(mathHtml: string, forClipboard: boolean): string {
  if (!forClipboard) {
    return `<span class="preserved-math">${mathHtml}</span>`;
  }

  const { latex, displayMode, mathml: existingMathml } = extractLatexFromMathHtml(mathHtml);

  try {
    // 优先使用已有的 MathML，转换为 OMML
    if (existingMathml) {
      return mml2omml(existingMathml);
    }

    if (latex) {
      const { mathml } = renderLatex(latex, displayMode);
      return mathml;  // renderLatex 已经返回 OMML
    }

    // 找不到 LaTeX 时，尽量提取可读文本
    const plain = extractMathPlainText(mathHtml);
    if (plain) {
      const { mathml } = renderLatex(plain, displayMode);
      return mathml;  // renderLatex 已经返回 OMML
    }

    // 最后兜底：直接用纯文本包装为 OMML
    const fallbackText = sanitizeText(mathHtml);
    const fallbackMml = `<math xmlns="http://www.w3.org/1998/Math/MathML"><mtext>${fallbackText || '公式'}</mtext></math>`;
    return mml2omml(fallbackMml);
  } catch (error) {
    console.error('[AI-Paste] 保留公式转 OMML 失败:', error);
    return `<span class="preserved-math">${mathHtml}</span>`;
  }
}

/**
 * 从已渲染的公式 HTML 中尽可能提取原始 LaTeX 内容
 */
function extractLatexFromMathHtml(mathHtml: string): { latex: string | null; displayMode: boolean; mathml: string | null } {
  const displayMode = /katex-display|MathJax_Display|mjx-container[^>]+display=("|')?(true|block)/i.test(mathHtml);

  // 有 DOM 时优先用 DOM 提取，兼容 service worker 环境则回退字符串正则
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = mathHtml;

    // 优先检查 KaTeX 的 katex-mathml 中是否已有 MathML
    const katexMathml = container.querySelector('.katex-mathml math');
    if (katexMathml) {
      // 直接使用 KaTeX 生成的 MathML
      return { latex: null, displayMode, mathml: katexMathml.outerHTML };
    }

    // KaTeX / MathJax 常见的 LaTeX 存储点
    const annotation = container.querySelector('annotation[encoding*="tex"]');
    if (annotation?.textContent?.trim()) {
      return { latex: annotation.textContent.trim(), displayMode, mathml: null };
    }

    const dataTex = (container.querySelector('[data-tex]') as HTMLElement | null)?.getAttribute('data-tex');
    if (dataTex && dataTex.trim()) {
      return { latex: dataTex.trim(), displayMode, mathml: null };
    }

    const scriptTex = container.querySelector('script[type="math/tex"], script[type="math/tex; mode=display"]');
    if (scriptTex?.textContent?.trim()) {
      const type = scriptTex.getAttribute('type') || '';
      const isDisplay = type.includes('display');
      return { latex: scriptTex.textContent.trim(), displayMode: displayMode || isDisplay, mathml: null };
    }

    // MathJax SVG 输出常见的隐藏 MathML
    const mjxAnnotation = container.querySelector('mjx-assistive-mml annotation[encoding*="tex"]');
    if (mjxAnnotation?.textContent?.trim()) {
      return { latex: mjxAnnotation.textContent.trim(), displayMode, mathml: null };
    }

    const mathAnnotation = container.querySelector('math annotation[encoding*="tex"]');
    if (mathAnnotation?.textContent?.trim()) {
      return { latex: mathAnnotation.textContent.trim(), displayMode, mathml: null };
    }

    // 可访问性属性
    const ariaLabel = container.querySelector('[aria-label]')?.getAttribute('aria-label');
    if (ariaLabel?.trim()) {
      return { latex: ariaLabel.trim(), displayMode, mathml: null };
    }

    const altText = (container.querySelector('[alttext]') as HTMLElement | null)?.getAttribute('alttext');
    if (altText?.trim()) {
      return { latex: altText.trim(), displayMode, mathml: null };
    }

    return { latex: null, displayMode, mathml: null };
  }

  // 正则回退（用于 service worker 环境）
  // 先尝试提取 KaTeX 的 MathML
  const katexMathmlMatch = mathHtml.match(/<span[^>]*class="katex-mathml"[^>]*>[\s\S]*?(<math[^>]*>[\s\S]*?<\/math>)/i);
  if (katexMathmlMatch?.[1]) {
    return { latex: null, displayMode, mathml: katexMathmlMatch[1] };
  }

  const annotationMatch = mathHtml.match(/<annotation[^>]*encoding=["'][^"']*tex[^"']*["'][^>]*>([\s\S]*?)<\/annotation>/i);
  if (annotationMatch?.[1]?.trim()) {
    return { latex: annotationMatch[1].trim(), displayMode, mathml: null };
  }

  const dataTexMatch = mathHtml.match(/data-tex=["']([^"']+)["']/i);
  if (dataTexMatch?.[1]) {
    return { latex: dataTexMatch[1].trim(), displayMode, mathml: null };
  }

  const scriptMatch = mathHtml.match(/<script[^>]*type=["']math\/tex[^"']*["'][^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch?.[1]) {
    const isDisplay = /math\/tex[^"']*display/i.test(scriptMatch[0]);
    return { latex: scriptMatch[1].trim(), displayMode: displayMode || isDisplay, mathml: null };
  }

  const ariaMatch = mathHtml.match(/aria-label=["']([^"']+)["']/i);
  if (ariaMatch?.[1]) {
    return { latex: ariaMatch[1].trim(), displayMode, mathml: null };
  }

  const altTextMatch = mathHtml.match(/alttext=["']([^"']+)["']/i);
  if (altTextMatch?.[1]) {
    return { latex: altTextMatch[1].trim(), displayMode, mathml: null };
  }

  const dataLatexMatch = mathHtml.match(/data-latex=["']([^"']+)["']/i);
  if (dataLatexMatch?.[1]) {
    return { latex: dataLatexMatch[1].trim(), displayMode, mathml: null };
  }

  return { latex: null, displayMode, mathml: null };
}

/**
 * 提取可读的数学文本，避免把 SVG 路径写入 Word
 */
function extractMathPlainText(mathHtml: string): string | null {
  const ariaMatch = mathHtml.match(/aria-label=["']([^"']+)["']/i);
  if (ariaMatch?.[1]) return ariaMatch[1].trim();

  const altMatch = mathHtml.match(/alttext=["']([^"']+)["']/i);
  if (altMatch?.[1]) return altMatch[1].trim();

  const dataLatexMatch = mathHtml.match(/data-latex=["']([^"']+)["']/i);
  if (dataLatexMatch?.[1]) return dataLatexMatch[1].trim();

  const plain = sanitizeText(mathHtml);
  if (plain && plain.length <= 120) {
    return plain;
  }
  return null;
}

function sanitizeText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 预处理：不做任何自动公式包装，避免误判
 * LaTeX 公式的识别完全依赖 convertMarkdown 中的正则匹配
 */
function wrapLooseMathLines(markdown: string): string {
  // 不做任何处理，直接返回原文
  // 公式识别由 convertMarkdown 中的 \[...\], $$...$$, \(...\), $...$ 正则处理
  return markdown;
}

/**
 * 判断括号内的内容是否是数学表达式
 */
function isMathExpression(content: string): boolean {
  // 包含中文则不是数学表达式
  if (/[\u4e00-\u9fff]/.test(content)) {
    return false;
  }

  // 强指标：LaTeX 命令、下标、上标、等号、约等号等
  const strongMathPattern = /(\\[a-zA-Z]+)|[_^=≈≤≥≠]/;
  if (strongMathPattern.test(content)) {
    return true;
  }

  // 函数调用模式：N(d), ln(x), exp(rT) 等
  const functionPattern = /\b(N|ln|exp|log|sin|cos|tan|f|g)\s*\(/;
  if (functionPattern.test(content)) {
    return true;
  }

  // 算术运算：包含运算符和数字/变量
  const arithmeticPattern = /[+\-*/]\s*[\d.a-zA-Z]/;
  if (arithmeticPattern.test(content)) {
    return true;
  }

  return false;
}

/**
 * 使用基于栈的解析器将 (...) 格式的数学表达式转换为占位符
 * 正确处理嵌套括号
 */
function convertSoftParenthesesToLatex(
  text: string,
  mathMap: Map<string, { type: 'rendered' | 'latex-block' | 'latex-inline'; content: string }>,
  startIndex: number
): string {
  let result = '';
  let buffer = '';
  let balance = 0;
  let mathIndex = startIndex;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '(') {
      if (balance === 0) {
        // 开始一个新的候选组
        buffer = '';
      } else {
        // 嵌套括号，继续捕获
        buffer += char;
      }
      balance++;
    } else if (char === ')') {
      balance--;

      if (balance === 0) {
        // 候选组结束，检查是否是数学表达式
        if (isMathExpression(buffer)) {
          // 是数学表达式：转换为占位符
          const placeholder = createMathPlaceholder(mathIndex++);
          mathMap.set(placeholder, { type: 'latex-inline', content: buffer });
          result += placeholder;
        } else {
          // 不是数学表达式：保留原始括号
          result += `(${buffer})`;
        }
        buffer = '';
      } else if (balance > 0) {
        // 关闭嵌套括号
        buffer += char;
      } else {
        // 不平衡的右括号
        result += char;
        balance = 0;
      }
    } else {
      // 普通字符
      if (balance > 0) {
        // 在组内，添加到缓冲区
        buffer += char;
      } else {
        // 在组外，添加到结果
        result += char;
      }
    }
  }

  // 处理未闭合的括号
  if (balance > 0) {
    result += `(${buffer}`;
  }

  return result;
}
