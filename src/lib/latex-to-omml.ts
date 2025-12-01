/**
 * LaTeX to OMML (Office Math Markup Language) converter
 * OMML is the native math format for Microsoft Word
 */

import { wrapOmmlForWord } from './mathml-to-omml';

interface OmmlElement {
  tag: string;
  children?: (OmmlElement | string)[];
  attrs?: Record<string, string>;
}

export function latexToOmml(latex: string): string {
  try {
    const cleaned = latex.trim();
    const ommlTree = parseLatex(cleaned);
    return renderOmml(ommlTree);
  } catch (error) {
    console.error('[AI-Paste] LaTeX to OMML conversion failed:', error);
    return createFallbackOmml(latex);
  }
}

function parseLatex(latex: string): OmmlElement {
  const tokens = tokenize(latex);
  const ast = buildAst(tokens);
  return convertToOmml(ast);
}

interface Token {
  type: 'command' | 'text' | 'number' | 'operator' | 'group_start' | 'group_end' | 'subscript' | 'superscript' | 'whitespace';
  value: string;
}

function tokenize(latex: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < latex.length) {
    const char = latex[i];

    if (char === '\\') {
      let cmd = '\\';
      i++;
      while (i < latex.length && /[a-zA-Z]/.test(latex[i])) {
        cmd += latex[i];
        i++;
      }
      if (cmd === '\\') {
        if (i < latex.length) {
          cmd += latex[i];
          i++;
        }
      }
      tokens.push({ type: 'command', value: cmd });
    } else if (char === '{') {
      tokens.push({ type: 'group_start', value: '{' });
      i++;
    } else if (char === '}') {
      tokens.push({ type: 'group_end', value: '}' });
      i++;
    } else if (char === '_') {
      tokens.push({ type: 'subscript', value: '_' });
      i++;
    } else if (char === '^') {
      tokens.push({ type: 'superscript', value: '^' });
      i++;
    } else if (/[0-9]/.test(char)) {
      let num = '';
      while (i < latex.length && /[0-9.]/.test(latex[i])) {
        num += latex[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
    } else if (/[a-zA-Z]/.test(char)) {
      tokens.push({ type: 'text', value: char });
      i++;
    } else if (/[+\-*/=<>()[\],.|!]/.test(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
    } else if (/\s/.test(char)) {
      tokens.push({ type: 'whitespace', value: ' ' });
      i++;
    } else {
      tokens.push({ type: 'text', value: char });
      i++;
    }
  }

  return tokens.filter(t => t.type !== 'whitespace');
}

interface AstNode {
  type: string;
  value?: string;
  children?: AstNode[];
  sub?: AstNode;
  sup?: AstNode;
  num?: AstNode;
  den?: AstNode;
  base?: AstNode;
  degree?: AstNode;
}

function buildAst(tokens: Token[]): AstNode {
  let pos = 0;

  function parseGroup(): AstNode[] {
    const nodes: AstNode[] = [];
    while (pos < tokens.length && tokens[pos].type !== 'group_end') {
      nodes.push(parseExpr());
    }
    return nodes;
  }

  function parseExpr(): AstNode {
    const token = tokens[pos];

    if (!token) {
      return { type: 'empty' };
    }

    if (token.type === 'group_start') {
      pos++;
      const children = parseGroup();
      if (tokens[pos]?.type === 'group_end') pos++;
      return { type: 'group', children };
    }

    if (token.type === 'command') {
      pos++;
      return parseCommand(token.value);
    }

    if (token.type === 'text' || token.type === 'number') {
      pos++;
      const node: AstNode = { type: token.type, value: token.value };
      return parseScripts(node);
    }

    if (token.type === 'operator') {
      pos++;
      return { type: 'operator', value: token.value };
    }

    pos++;
    return { type: 'unknown', value: token.value };
  }

  function parseCommand(cmd: string): AstNode {
    switch (cmd) {
      case '\\frac': {
        const num = parseNextArg();
        const den = parseNextArg();
        return { type: 'frac', num, den };
      }
      case '\\sqrt': {
        if (tokens[pos]?.value === '[') {
          pos++;
          const degreeNodes: AstNode[] = [];
          while (pos < tokens.length && tokens[pos].value !== ']') {
            degreeNodes.push(parseExpr());
          }
          if (tokens[pos]?.value === ']') pos++;
          const base = parseNextArg();
          return { type: 'radical', base, degree: { type: 'group', children: degreeNodes } };
        }
        const base = parseNextArg();
        return { type: 'sqrt', base };
      }
      case '\\sum':
      case '\\prod':
      case '\\int': {
        const node: AstNode = { type: 'nary', value: cmd };
        return parseScripts(node);
      }
      case '\\alpha': return { type: 'symbol', value: 'α' };
      case '\\beta': return { type: 'symbol', value: 'β' };
      case '\\gamma': return { type: 'symbol', value: 'γ' };
      case '\\delta': return { type: 'symbol', value: 'δ' };
      case '\\epsilon': return { type: 'symbol', value: 'ε' };
      case '\\theta': return { type: 'symbol', value: 'θ' };
      case '\\lambda': return { type: 'symbol', value: 'λ' };
      case '\\mu': return { type: 'symbol', value: 'μ' };
      case '\\pi': return { type: 'symbol', value: 'π' };
      case '\\sigma': return { type: 'symbol', value: 'σ' };
      case '\\phi': return { type: 'symbol', value: 'φ' };
      case '\\omega': return { type: 'symbol', value: 'ω' };
      case '\\infty': return { type: 'symbol', value: '∞' };
      case '\\pm': return { type: 'operator', value: '±' };
      case '\\times': return { type: 'operator', value: '×' };
      case '\\div': return { type: 'operator', value: '÷' };
      case '\\leq': return { type: 'operator', value: '≤' };
      case '\\geq': return { type: 'operator', value: '≥' };
      case '\\neq': return { type: 'operator', value: '≠' };
      case '\\approx': return { type: 'operator', value: '≈' };
      case '\\cdot': return { type: 'operator', value: '·' };
      case '\\rightarrow': return { type: 'operator', value: '→' };
      case '\\leftarrow': return { type: 'operator', value: '←' };
      case '\\Rightarrow': return { type: 'operator', value: '⇒' };
      case '\\left':
      case '\\right':
        if (pos < tokens.length) {
          const next = tokens[pos];
          pos++;
          return { type: 'delimiter', value: next.value };
        }
        return { type: 'empty' };
      default:
        return { type: 'text', value: cmd.slice(1) };
    }
  }

  function parseNextArg(): AstNode {
    if (tokens[pos]?.type === 'group_start') {
      pos++;
      const children = parseGroup();
      if (tokens[pos]?.type === 'group_end') pos++;
      return { type: 'group', children };
    }
    return parseExpr();
  }

  function parseScripts(node: AstNode): AstNode {
    while (pos < tokens.length) {
      if (tokens[pos].type === 'subscript') {
        pos++;
        node.sub = parseNextArg();
      } else if (tokens[pos].type === 'superscript') {
        pos++;
        node.sup = parseNextArg();
      } else {
        break;
      }
    }
    return node;
  }

  const children = parseGroup();
  return { type: 'root', children };
}

function convertToOmml(ast: AstNode): OmmlElement {
  function convert(node: AstNode): OmmlElement | string {
    switch (node.type) {
      case 'root':
      case 'group':
        return {
          tag: 'm:oMath',
          children: (node.children || []).map(convert)
        };

      case 'frac':
        return {
          tag: 'm:f',
          children: [
            { tag: 'm:num', children: [convert(node.num!)] },
            { tag: 'm:den', children: [convert(node.den!)] }
          ]
        };

      case 'sqrt':
        return {
          tag: 'm:rad',
          children: [
            { tag: 'm:radPr', children: [{ tag: 'm:degHide', attrs: { 'm:val': '1' } }] },
            { tag: 'm:deg' },
            { tag: 'm:e', children: [convert(node.base!)] }
          ]
        };

      case 'radical':
        return {
          tag: 'm:rad',
          children: [
            { tag: 'm:deg', children: node.degree ? [convert(node.degree)] : [] },
            { tag: 'm:e', children: [convert(node.base!)] }
          ]
        };

      case 'nary': {
        const naryChar = node.value === '\\sum' ? '∑' : node.value === '\\prod' ? '∏' : '∫';
        const children: OmmlElement[] = [
          {
            tag: 'm:naryPr',
            children: [
              { tag: 'm:chr', attrs: { 'm:val': naryChar } }
            ]
          }
        ];
        if (node.sub) {
          children.push({ tag: 'm:sub', children: [convert(node.sub)] });
        }
        if (node.sup) {
          children.push({ tag: 'm:sup', children: [convert(node.sup)] });
        }
        children.push({ tag: 'm:e' });
        return { tag: 'm:nary', children };
      }

      case 'text':
      case 'number':
      case 'symbol':
        if (node.sub || node.sup) {
          return createSubSup(node);
        }
        return {
          tag: 'm:r',
          children: [{ tag: 'm:t', children: [node.value || ''] }]
        };

      case 'operator':
        return {
          tag: 'm:r',
          children: [{ tag: 'm:t', children: [node.value || ''] }]
        };

      case 'delimiter':
        return {
          tag: 'm:r',
          children: [{ tag: 'm:t', children: [node.value || ''] }]
        };

      default:
        return { tag: 'm:r', children: [{ tag: 'm:t', children: [node.value || ''] }] };
    }
  }

  function createSubSup(node: AstNode): OmmlElement {
    const base: OmmlElement = {
      tag: 'm:e',
      children: [{
        tag: 'm:r',
        children: [{ tag: 'm:t', children: [node.value || ''] }]
      }]
    };

    if (node.sub && node.sup) {
      return {
        tag: 'm:sSubSup',
        children: [
          base,
          { tag: 'm:sub', children: [convert(node.sub) as OmmlElement] },
          { tag: 'm:sup', children: [convert(node.sup) as OmmlElement] }
        ]
      };
    } else if (node.sub) {
      return {
        tag: 'm:sSub',
        children: [
          base,
          { tag: 'm:sub', children: [convert(node.sub) as OmmlElement] }
        ]
      };
    } else if (node.sup) {
      return {
        tag: 'm:sSup',
        children: [
          base,
          { tag: 'm:sup', children: [convert(node.sup) as OmmlElement] }
        ]
      };
    }

    return base;
  }

  return convert(ast) as OmmlElement;
}

function renderOmml(element: OmmlElement): string {
  const attrs = element.attrs
    ? ' ' + Object.entries(element.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
    : '';

  if (!element.children || element.children.length === 0) {
    return `<${element.tag}${attrs}/>`;
  }

  const childrenStr = element.children
    .map(child => typeof child === 'string' ? escapeXml(child) : renderOmml(child))
    .join('');

  return `<${element.tag}${attrs}>${childrenStr}</${element.tag}>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createFallbackOmml(latex: string): string {
  return `<m:oMath><m:r><m:t>${escapeXml(latex)}</m:t></m:r></m:oMath>`;
}

export function convertLatexInHtml(html: string): string {
  // Block math: $$...$$
  html = html.replace(/\$\$([^$]+)\$\$/g, (_match, latex) => {
    const omml = latexToOmml(latex);
    return `<span class="math-block">${wrapOmmlForWord(omml, true)}</span>`;
  });

  // Block math: \[...\]
  html = html.replace(/\\\[([\s\S]+?)\\\]/g, (_match, latex) => {
    const omml = latexToOmml(latex);
    return `<span class="math-block">${wrapOmmlForWord(omml, true)}</span>`;
  });

  // Inline math: $...$
  html = html.replace(/\$([^$]+)\$/g, (_match, latex) => {
    const omml = latexToOmml(latex);
    return `<span class="math-inline">${wrapOmmlForWord(omml, false)}</span>`;
  });

  // Inline math: \(...\)
  html = html.replace(/\\\(([\s\S]+?)\\\)/g, (_match, latex) => {
    const omml = latexToOmml(latex);
    return `<span class="math-inline">${wrapOmmlForWord(omml, false)}</span>`;
  });

  return html;
}
