import { marked } from 'marked';
import hljs from 'highlight.js';
import { processLatexInText, renderLatex } from './math-renderer';

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

/**
 * 合并被拆分的公式行（AI 输出常见问题）
 * 例如 "C\n=\nS\n0\n·\nN\n(\nd\n1\n)" 合并为 "C = S0 · N(d1)"
 */
function rejoinSplitMathLines(text: string): string {
  const lines = text.split('\n');
  if (lines.length < 2) return text;

  const merged: string[] = [];
  let buffer = '';
  let inMathContext = false;

  // 检测是否为数学符号/片段（单字符或短数学表达式）
  const isMathFragment = (s: string) => {
    const t = s.trim();
    if (!t) return false;
    // 单字符数学符号
    if (t.length === 1 && /[a-zA-Z0-9=+\-*/^_()[\]{}·×÷±≤≥≠≈∑∏∫]/.test(t)) return true;
    // 短数学片段（无中文，长度<30）
    if (t.length < 30 && !/[\u4e00-\u9fff]/.test(t) && /^[a-zA-Z0-9=+\-*/^_()[\]{}·×÷±≤≥≠≈∑∏∫\s.]+$/.test(t)) return true;
    return false;
  };

  // 检测是否为普通文本行（含中文或长句子）
  const isTextLine = (s: string) => {
    const t = s.trim();
    if (!t) return false;
    // 含中文
    if (/[\u4e00-\u9fff]/.test(t)) return true;
    // 长度>50且不像公式
    if (t.length > 50 && !/[=+\-*/^_{}\\]/.test(t)) return true;
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行：结束当前数学上下文
    if (!trimmed) {
      if (buffer) {
        merged.push(buffer);
        buffer = '';
      }
      merged.push(line);
      inMathContext = false;
      continue;
    }

    // 普通文本行：结束数学上下文，单独保留
    if (isTextLine(trimmed)) {
      if (buffer) {
        merged.push(buffer);
        buffer = '';
      }
      merged.push(line);
      inMathContext = false;
      continue;
    }

    // 数学片段：合并到 buffer
    if (isMathFragment(trimmed)) {
      if (!inMathContext && buffer) {
        merged.push(buffer);
        buffer = '';
      }
      inMathContext = true;
      // 智能添加空格：数字紧跟字母、括号内容等不需要空格
      if (buffer) {
        const lastChar = buffer.trim().slice(-1);
        const firstChar = trimmed[0];
        // 不需要空格的情况：
        // 1. 上一个是字母/下标，当前是数字（如 S0, d1）
        // 2. 上一个是左括号，或当前是右括号
        // 3. 上一个或当前是下标/上标符号
        const isLetterThenDigit = /[a-zA-Z]$/.test(lastChar) && /^[0-9]/.test(firstChar);
        const isBracketContext = /[(\[]$/.test(lastChar) || /^[)\]]/.test(firstChar);
        const isSubscript = /[_^]$/.test(lastChar) || /^[_^]/.test(firstChar);
        const needSpace = !isLetterThenDigit && !isBracketContext && !isSubscript;
        buffer += (needSpace ? ' ' : '') + trimmed;
      } else {
        buffer = trimmed;
      }
      continue;
    }

    // 其他情况：保留原样
    if (buffer) {
      merged.push(buffer);
      buffer = '';
    }
    merged.push(line);
    inMathContext = false;
  }

  if (buffer) {
    merged.push(buffer);
  }

  return merged.join('\n');
}

export async function convertMarkdown(markdown: string, forClipboard: boolean = false): Promise<string> {
  // 预处理0：将 HTML 换行符归一化为普通换行，避免打散 LaTeX 环境匹配
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // 预处理1：合并被拆分的公式行（AI 输出常见问题）
  markdown = rejoinSplitMathLines(markdown);

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
  const div = document.createElement('div');
  div.innerHTML = html;

  // 移除不需要的元素
  div.querySelectorAll('script, style, meta, link').forEach(el => el.remove());

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
 * - 剪贴板：提取 LaTeX 后转为 MathML，Word 2013+ 原生支持
 */
function convertPreservedMath(mathHtml: string, forClipboard: boolean): string {
  if (!forClipboard) {
    return `<span class="preserved-math">${mathHtml}</span>`;
  }

  const { latex, displayMode } = extractLatexFromMathHtml(mathHtml);

  try {
    if (latex) {
      const { mathml } = renderLatex(latex, displayMode);
      return mathml;
    }

    // 找不到 LaTeX 时，尽量提取可读文本
    const plain = extractMathPlainText(mathHtml);
    if (plain) {
      const { mathml } = renderLatex(plain, displayMode);
      return mathml;
    }

    // 最后兜底：直接用纯文本包装为 MathML
    const fallbackText = sanitizeText(mathHtml);
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"><mtext>${fallbackText || '公式'}</mtext></math>`;
  } catch (error) {
    console.error('[AI-Paste] 保留公式转 MathML 失败:', error);
    return `<span class="preserved-math">${mathHtml}</span>`;
  }
}

/**
 * 从已渲染的公式 HTML 中尽可能提取原始 LaTeX 内容
 */
function extractLatexFromMathHtml(mathHtml: string): { latex: string | null; displayMode: boolean } {
  const displayMode = /katex-display|MathJax_Display|mjx-container[^>]+display=("|')?(true|block)/i.test(mathHtml);

  // 有 DOM 时优先用 DOM 提取，兼容 service worker 环境则回退字符串正则
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = mathHtml;

    // KaTeX / MathJax 常见的 LaTeX 存储点
    const annotation = container.querySelector('annotation[encoding*="tex"]');
    if (annotation?.textContent?.trim()) {
      return { latex: annotation.textContent.trim(), displayMode };
    }

    const dataTex = (container.querySelector('[data-tex]') as HTMLElement | null)?.getAttribute('data-tex');
    if (dataTex && dataTex.trim()) {
      return { latex: dataTex.trim(), displayMode };
    }

    const scriptTex = container.querySelector('script[type="math/tex"], script[type="math/tex; mode=display"]');
    if (scriptTex?.textContent?.trim()) {
      const type = scriptTex.getAttribute('type') || '';
      const isDisplay = type.includes('display');
      return { latex: scriptTex.textContent.trim(), displayMode: displayMode || isDisplay };
    }

    // MathJax SVG 输出常见的隐藏 MathML
    const mjxAnnotation = container.querySelector('mjx-assistive-mml annotation[encoding*="tex"]');
    if (mjxAnnotation?.textContent?.trim()) {
      return { latex: mjxAnnotation.textContent.trim(), displayMode };
    }

    const mathAnnotation = container.querySelector('math annotation[encoding*="tex"]');
    if (mathAnnotation?.textContent?.trim()) {
      return { latex: mathAnnotation.textContent.trim(), displayMode };
    }

    // 可访问性属性
    const ariaLabel = container.querySelector('[aria-label]')?.getAttribute('aria-label');
    if (ariaLabel?.trim()) {
      return { latex: ariaLabel.trim(), displayMode };
    }

    const altText = (container.querySelector('[alttext]') as HTMLElement | null)?.getAttribute('alttext');
    if (altText?.trim()) {
      return { latex: altText.trim(), displayMode };
    }

    return { latex: null, displayMode };
  }

  const annotationMatch = mathHtml.match(/<annotation[^>]*encoding=["'][^"']*tex[^"']*["'][^>]*>([\s\S]*?)<\/annotation>/i);
  if (annotationMatch?.[1]?.trim()) {
    return { latex: annotationMatch[1].trim(), displayMode };
  }

  const dataTexMatch = mathHtml.match(/data-tex=["']([^"']+)["']/i);
  if (dataTexMatch?.[1]) {
    return { latex: dataTexMatch[1].trim(), displayMode };
  }

  const scriptMatch = mathHtml.match(/<script[^>]*type=["']math\/tex[^"']*["'][^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch?.[1]) {
    const isDisplay = /math\/tex[^"']*display/i.test(scriptMatch[0]);
    return { latex: scriptMatch[1].trim(), displayMode: displayMode || isDisplay };
  }

  const ariaMatch = mathHtml.match(/aria-label=["']([^"']+)["']/i);
  if (ariaMatch?.[1]) {
    return { latex: ariaMatch[1].trim(), displayMode };
  }

  const altTextMatch = mathHtml.match(/alttext=["']([^"']+)["']/i);
  if (altTextMatch?.[1]) {
    return { latex: altTextMatch[1].trim(), displayMode };
  }

  const dataLatexMatch = mathHtml.match(/data-latex=["']([^"']+)["']/i);
  if (dataLatexMatch?.[1]) {
    return { latex: dataLatexMatch[1].trim(), displayMode };
  }

  return { latex: null, displayMode };
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
