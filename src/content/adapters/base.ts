export interface SiteAdapter {
  name: string;
  hostnames: string[];
  selectors: {
    messageContainer: string;
    assistantMessage: string;
    codeBlock?: string;
    mathBlock?: string;
  };
  extractContent(element: Element): string;
  isAssistantMessage(element: Element): boolean;
  getMessageContainer(element: Element): Element | null;
}

export abstract class BaseAdapter implements SiteAdapter {
  abstract name: string;
  abstract hostnames: string[];
  abstract selectors: {
    messageContainer: string;
    assistantMessage: string;
    codeBlock?: string;
    mathBlock?: string;
  };

  extractContent(element: Element): string {
    const clone = element.cloneNode(true) as Element;

    // 移除不需要的元素
    clone.querySelectorAll('button, .copy-button, [data-copy]').forEach(el => el.remove());

    // 保存已渲染的公式 HTML（KaTeX/MathJax 生成的）
    const mathElements = clone.querySelectorAll('.katex, .katex-display, .MathJax, .MathJax_Display, .math, [class*="math"], mjx-container');
    const mathPlaceholders: Map<string, string> = new Map();

    mathElements.forEach((mathEl, index) => {
      const placeholder = `__MATH_PLACEHOLDER_${index}__`;
      // 保存完整的公式 HTML
      mathPlaceholders.set(placeholder, mathEl.outerHTML);
      // 替换为占位符
      const placeholderEl = document.createElement('span');
      placeholderEl.setAttribute('data-math-placeholder', placeholder);
      placeholderEl.textContent = placeholder;
      mathEl.parentElement?.replaceChild(placeholderEl, mathEl);
    });

    // 处理代码块
    const codeBlocks = clone.querySelectorAll('pre code, pre');
    codeBlocks.forEach(block => {
      const lang = this.detectLanguage(block);
      const code = block.textContent || '';
      const placeholder = document.createElement('div');
      placeholder.setAttribute('data-code-block', 'true');
      placeholder.setAttribute('data-language', lang);
      placeholder.textContent = code;
      block.parentElement?.replaceChild(placeholder, block);
    });

    let content = this.htmlToMarkdown(clone);
    content = this.restoreCodeBlocks(content, clone);

    // 恢复公式 HTML（用特殊标记包裹，以便后续处理）
    mathPlaceholders.forEach((html, placeholder) => {
      // 使用特殊标记包裹，表示这是已渲染的公式
      content = content.replace(placeholder, `<!--RENDERED_MATH_START-->${html}<!--RENDERED_MATH_END-->`);
    });

    return content.trim();
  }

  protected detectLanguage(element: Element): string {
    const classList = Array.from(element.classList);
    for (const cls of classList) {
      if (cls.startsWith('language-')) {
        return cls.replace('language-', '');
      }
      if (cls.startsWith('hljs-')) {
        continue;
      }
      const langMatch = cls.match(/^(javascript|typescript|python|java|cpp|c|go|rust|ruby|php|swift|kotlin|sql|html|css|json|yaml|xml|bash|shell|markdown)$/i);
      if (langMatch) {
        return langMatch[1].toLowerCase();
      }
    }

    const parent = element.closest('pre');
    if (parent) {
      const parentLang = this.detectLanguage(parent);
      if (parentLang !== 'plaintext') return parentLang;
    }

    return 'plaintext';
  }

  protected htmlToMarkdown(element: Element): string {
    let result = '';

    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      let content = Array.from(el.childNodes).map(walk).join('');

      switch (tag) {
        case 'h1': return `# ${content}\n\n`;
        case 'h2': return `## ${content}\n\n`;
        case 'h3': return `### ${content}\n\n`;
        case 'h4': return `#### ${content}\n\n`;
        case 'h5': return `##### ${content}\n\n`;
        case 'h6': return `###### ${content}\n\n`;
        case 'p': return `${content}\n\n`;
        case 'br': return '\n';
        case 'strong':
        case 'b': return `**${content}**`;
        case 'em':
        case 'i': return `*${content}*`;
        case 'code':
          if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
            return `\`${content}\``;
          }
          return content;
        case 'pre': {
          const codeEl = el.querySelector('code');
          const code = codeEl?.textContent || el.textContent || '';
          const lang = this.detectLanguage(codeEl || el);
          return `\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        }
        case 'a': {
          const href = el.getAttribute('href') || '';
          return `[${content}](${href})`;
        }
        case 'img': {
          const src = el.getAttribute('src') || '';
          const alt = el.getAttribute('alt') || '';
          return `![${alt}](${src})`;
        }
        case 'ul': {
          const items = Array.from(el.children)
            .map(li => `- ${walk(li).trim()}`)
            .join('\n');
          return `\n${items}\n\n`;
        }
        case 'ol': {
          const items = Array.from(el.children)
            .map((li, i) => `${i + 1}. ${walk(li).trim()}`)
            .join('\n');
          return `\n${items}\n\n`;
        }
        case 'li': return content;
        case 'blockquote': {
          const lines = content.trim().split('\n').map(line => `> ${line}`).join('\n');
          return `\n${lines}\n\n`;
        }
        case 'table': return this.tableToMarkdown(el);
        case 'hr': return '\n---\n\n';
        case 'div':
          if (el.hasAttribute('data-code-block')) {
            const lang = el.getAttribute('data-language') || 'plaintext';
            const code = el.textContent || '';
            return `\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
          }
          return content;
        default: return content;
      }
    };

    result = walk(element);
    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  protected tableToMarkdown(table: Element): string {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result: string[] = [];

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellContents = cells.map(cell => (cell.textContent || '').trim().replace(/\|/g, '\\|'));
      result.push(`| ${cellContents.join(' | ')} |`);

      if (rowIndex === 0) {
        result.push(`| ${cells.map(() => '---').join(' | ')} |`);
      }
    });

    return `\n${result.join('\n')}\n\n`;
  }

  protected restoreCodeBlocks(markdown: string, _element: Element): string {
    return markdown;
  }

  isAssistantMessage(element: Element): boolean {
    return element.matches(this.selectors.assistantMessage);
  }

  getMessageContainer(element: Element): Element | null {
    return element.closest(this.selectors.messageContainer);
  }
}
