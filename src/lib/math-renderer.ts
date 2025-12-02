/**
 * Math formula renderer
 * Uses KaTeX for preview (HTML) and OMML for Word clipboard
 * OMML (Office Math Markup Language) is natively supported by Word on all platforms
 */
import katex from 'katex';
import { mml2omml } from 'mathml2omml';

export interface MathRenderResult {
  html: string;
  mathml: string;  // Actually OMML for Word compatibility
}

/**
 * Render LaTeX to both HTML (for preview) and MathML (for Word)
 */
export function renderLatex(latex: string, displayMode: boolean = false): MathRenderResult {
  let html: string;
  let mathml: string;

  // 预处理：修复 AI 输出中常见的换行符问题
  // AI 常输出 "d(v_1) &= 0 \" 而非标准的 "d(v_1) &= 0 \\"
  // 将行尾单个反斜杠（后跟换行）转换为双反斜杠
  latex = latex.replace(/\\\s*\n/g, '\\\\\n');

  // HTML for preview using KaTeX
  try {
    html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false
    });
  } catch (error) {
    console.error('[AI-Paste] KaTeX render error:', error);
    html = `<span class="math-error">${escapeHtml(latex)}</span>`;
  }

  // OMML for Word - convert MathML to OMML for better Windows Word compatibility
  try {
    const mml = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'mathml',
      strict: false
    });
    // Convert MathML to OMML (Office Math Markup Language)
    mathml = mml2omml(mml);
  } catch (error) {
    console.error('[AI-Paste] OMML render error:', error);
    // Fallback: wrap LaTeX in basic MathML
    mathml = `<math xmlns="http://www.w3.org/1998/Math/MathML"><mtext>${escapeHtml(latex)}</mtext></math>`;
  }

  return { html, mathml };
}

/**
 * Process text and convert all LaTeX formulas
 * Supports: $...$, $$...$$, \(...\), \[...\], and standalone [...] with LaTeX content
 */
export function processLatexInText(text: string, forClipboard: boolean = false): string {
  // Block math: $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
    const result = renderLatex(latex.trim(), true);
    return forClipboard ? result.mathml : result.html;
  });

  // Block math: \[...\]
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, latex) => {
    const result = renderLatex(latex.trim(), true);
    return forClipboard ? result.mathml : result.html;
  });

  // Block math: standalone [...] containing LaTeX (common in AI outputs)
  // Match [...] that contains LaTeX-like content (backslashes, ^, _, {, })
  text = text.replace(/^\s*\[\s*\n?([\s\S]+?)\n?\s*\]\s*$/gm, (_match, content) => {
    // Check if content looks like LaTeX (contains math symbols)
    if (isLikelyLatex(content)) {
      const result = renderLatex(content.trim(), true);
      return forClipboard ? result.mathml : result.html;
    }
    return _match; // Not LaTeX, return original
  });

  // Inline math: $...$
  text = text.replace(/\$([^$\n]+?)\$/g, (_match, latex) => {
    const result = renderLatex(latex.trim(), false);
    return forClipboard ? result.mathml : result.html;
  });

  // Inline math: \(...\)
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_match, latex) => {
    const result = renderLatex(latex.trim(), false);
    return forClipboard ? result.mathml : result.html;
  });

  return text;
}

/**
 * Check if content looks like LaTeX math
 */
function isLikelyLatex(content: string): boolean {
  // LaTeX indicators: backslash commands, subscript, superscript, fractions, etc.
  const latexPatterns = [
    /\\/,           // backslash (commands like \frac, \sqrt)
    /[_^]/,         // subscript or superscript
    /\{.*\}/,       // braces
    /\\frac/,
    /\\sqrt/,
    /\\sum/,
    /\\int/,
    /\\left/,
    /\\right/,
    /\\cdot/,
    /\\times/,
    /\\pm/,
    /\\infty/,
    /\\alpha|\\beta|\\gamma|\\sigma|\\pi/,
  ];

  return latexPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if text contains LaTeX formulas
 */
export function containsLatex(text: string): boolean {
  return /\$[^$]+\$|\$\$[^$]+\$\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]/.test(text);
}

/**
 * Extract all LaTeX formulas from text
 */
export function extractLatexFormulas(text: string): string[] {
  const formulas: string[] = [];
  const patterns = [
    /\$\$([^$]+)\$\$/g,
    /\$([^$\n]+)\$/g,
    /\\\[([^\]]+)\\\]/g,
    /\\\(([^)]+)\\\)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      formulas.push(match[1].trim());
    }
  }

  return formulas;
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
