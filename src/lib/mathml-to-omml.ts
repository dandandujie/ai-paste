/**
 * MathML to OMML (Office Math Markup Language) converter
 * Converts MathML (from KaTeX) to Word's native math format
 */

const OMML_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

interface OmmlNode {
  tag: string;
  attrs?: Record<string, string>;
  children?: (OmmlNode | string)[];
}

/**
 * Convert MathML string to OMML string
 */
export function mathmlToOmml(mathml: string): string {
  try {
    // Parse MathML
    const parser = new DOMParser();
    const doc = parser.parseFromString(mathml, 'text/xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('[AI-Paste] MathML parsing error:', parserError.textContent);
      return createFallbackOmml(mathml);
    }

    const mathElement = doc.querySelector('math');
    if (!mathElement) {
      return createFallbackOmml(mathml);
    }

    // Convert to OMML structure
    const ommlNode = convertMathElement(mathElement);
    
    // Render OMML XML
    return renderOmml(ommlNode);
  } catch (error) {
    console.error('[AI-Paste] MathML to OMML conversion failed:', error);
    return createFallbackOmml(mathml);
  }
}

/**
 * Convert MathML math element to OMML structure
 */
function convertMathElement(mathElement: Element): OmmlNode {
  const children: (OmmlNode | string)[] = [];
  
  for (const child of Array.from(mathElement.childNodes)) {
    const converted = convertNode(child);
    if (converted) {
      if (Array.isArray(converted)) {
        children.push(...converted);
      } else {
        children.push(converted);
      }
    }
  }

  return {
    tag: 'm:oMath',
    children
  };
}

/**
 * Convert a single MathML node to OMML
 */
function convertNode(node: Node): OmmlNode | OmmlNode[] | string | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').trim();
    return text ? createTextRun(text) : null;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'mrow':
      return convertChildren(element);

    case 'mi': // identifier
    case 'mn': // number
    case 'mo': // operator
    case 'mtext': // text
      return createTextRun(element.textContent || '');

    case 'msup': // superscript
      return convertSuperscript(element);

    case 'msub': // subscript
      return convertSubscript(element);

    case 'msubsup': // subscript and superscript
      return convertSubSup(element);

    case 'mfrac': // fraction
      return convertFraction(element);

    case 'msqrt': // square root
      return convertSqrt(element);

    case 'mroot': // nth root
      return convertRoot(element);

    case 'munder': // underscript
      return convertUnder(element);

    case 'mover': // overscript
      return convertOver(element);

    case 'munderover': // under and over
      return convertUnderOver(element);

    case 'mfenced': // fenced expression (parentheses, brackets, etc.)
      return convertFenced(element);

    case 'mtable': // matrix/table
      return convertTable(element);

    case 'mspace': // space
      return createTextRun(' ');

    case 'mstyle': // styling (just process children)
      return convertChildren(element);

    case 'semantics': // semantic wrapper (use first child)
      return element.firstElementChild ? convertNode(element.firstElementChild) : null;

    default:
      // Unknown element, try to process children
      console.warn('[AI-Paste] Unknown MathML element:', tagName);
      return convertChildren(element);
  }
}

/**
 * Convert all children of an element
 */
function convertChildren(element: Element): OmmlNode[] {
  const results: OmmlNode[] = [];
  
  for (const child of Array.from(element.childNodes)) {
    const converted = convertNode(child);
    if (converted) {
      if (Array.isArray(converted)) {
        results.push(...converted);
      } else {
        results.push(converted as OmmlNode);
      }
    }
  }
  
  return results;
}

/**
 * Create a text run (m:r with m:t)
 */
function createTextRun(text: string): OmmlNode {
  return {
    tag: 'm:r',
    children: [
      {
        tag: 'm:t',
        children: [text]
      }
    ]
  };
}

/**
 * Convert superscript (msup)
 */
function convertSuperscript(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 2) return createTextRun('');

  const base = convertNode(children[0]);
  const sup = convertNode(children[1]);

  return {
    tag: 'm:sSup',
    children: [
      { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] },
      { tag: 'm:sup', children: Array.isArray(sup) ? sup : [sup as OmmlNode] }
    ]
  };
}

/**
 * Convert subscript (msub)
 */
function convertSubscript(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 2) return createTextRun('');

  const base = convertNode(children[0]);
  const sub = convertNode(children[1]);

  return {
    tag: 'm:sSub',
    children: [
      { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] },
      { tag: 'm:sub', children: Array.isArray(sub) ? sub : [sub as OmmlNode] }
    ]
  };
}

/**
 * Convert subscript and superscript (msubsup)
 */
function convertSubSup(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 3) return createTextRun('');

  const base = convertNode(children[0]);
  const sub = convertNode(children[1]);
  const sup = convertNode(children[2]);

  return {
    tag: 'm:sSubSup',
    children: [
      { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] },
      { tag: 'm:sub', children: Array.isArray(sub) ? sub : [sub as OmmlNode] },
      { tag: 'm:sup', children: Array.isArray(sup) ? sup : [sup as OmmlNode] }
    ]
  };
}

/**
 * Convert fraction (mfrac)
 */
function convertFraction(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 2) return createTextRun('');

  const num = convertNode(children[0]);
  const den = convertNode(children[1]);

  return {
    tag: 'm:f',
    children: [
      { tag: 'm:num', children: Array.isArray(num) ? num : [num as OmmlNode] },
      { tag: 'm:den', children: Array.isArray(den) ? den : [den as OmmlNode] }
    ]
  };
}

/**
 * Convert square root (msqrt)
 */
function convertSqrt(element: Element): OmmlNode {
  const children = convertChildren(element);

  return {
    tag: 'm:rad',
    children: [
      {
        tag: 'm:radPr',
        children: [{ tag: 'm:degHide', attrs: { 'm:val': '1' } }]
      },
      { tag: 'm:deg' },
      { tag: 'm:e', children }
    ]
  };
}

/**
 * Convert nth root (mroot)
 */
function convertRoot(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 2) return createTextRun('');

  const base = convertNode(children[0]);
  const index = convertNode(children[1]);

  return {
    tag: 'm:rad',
    children: [
      { tag: 'm:deg', children: Array.isArray(index) ? index : [index as OmmlNode] },
      { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] }
    ]
  };
}

/**
 * Convert underscript (munder)
 */
function convertUnder(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 2) return createTextRun('');

  const base = convertNode(children[0]);
  const under = convertNode(children[1]);

  // Check if base is a large operator (sum, integral, etc.)
  const baseText = children[0].textContent?.trim() || '';
  const isNary = /^[∑∏∫∮∯∰∱∲∳]$/.test(baseText);

  if (isNary) {
    return {
      tag: 'm:nary',
      children: [
        {
          tag: 'm:naryPr',
          children: [
            { tag: 'm:chr', attrs: { 'm:val': baseText } },
            { tag: 'm:limLoc', attrs: { 'm:val': 'undOver' } }
          ]
        },
        { tag: 'm:sub', children: Array.isArray(under) ? under : [under as OmmlNode] },
        { tag: 'm:sup' },
        { tag: 'm:e' }
      ]
    };
  }

  return {
    tag: 'm:limLow',
    children: [
      { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] },
      { tag: 'm:lim', children: Array.isArray(under) ? under : [under as OmmlNode] }
    ]
  };
}

/**
 * Convert overscript (mover)
 */
function convertOver(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 2) return createTextRun('');

  const base = convertNode(children[0]);
  const over = convertNode(children[1]);

  const baseText = children[0].textContent?.trim() || '';
  const isNary = /^[∑∏∫∮∯∰∱∲∳]$/.test(baseText);

  if (isNary) {
    return {
      tag: 'm:nary',
      children: [
        {
          tag: 'm:naryPr',
          children: [
            { tag: 'm:chr', attrs: { 'm:val': baseText } },
            { tag: 'm:limLoc', attrs: { 'm:val': 'undOver' } }
          ]
        },
        { tag: 'm:sub' },
        { tag: 'm:sup', children: Array.isArray(over) ? over : [over as OmmlNode] },
        { tag: 'm:e' }
      ]
    };
  }

  // Check for accent marks
  const overText = children[1].textContent?.trim() || '';
  const isAccent = /^[̂̃̄̅̆̇̈̉̊̋̌̍̎̏]$/.test(overText) || overText.length === 1;

  if (isAccent) {
    return {
      tag: 'm:acc',
      children: [
        {
          tag: 'm:accPr',
          children: [{ tag: 'm:chr', attrs: { 'm:val': overText } }]
        },
        { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] }
      ]
    };
  }

  return {
    tag: 'm:limUpp',
    children: [
      { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] },
      { tag: 'm:lim', children: Array.isArray(over) ? over : [over as OmmlNode] }
    ]
  };
}

/**
 * Convert underover (munderover)
 */
function convertUnderOver(element: Element): OmmlNode {
  const children = Array.from(element.children);
  if (children.length < 3) return createTextRun('');

  const base = convertNode(children[0]);
  const under = convertNode(children[1]);
  const over = convertNode(children[2]);

  const baseText = children[0].textContent?.trim() || '';
  const isNary = /^[∑∏∫∮∯∰∱∲∳]$/.test(baseText);

  if (isNary) {
    return {
      tag: 'm:nary',
      children: [
        {
          tag: 'm:naryPr',
          children: [
            { tag: 'm:chr', attrs: { 'm:val': baseText } },
            { tag: 'm:limLoc', attrs: { 'm:val': 'undOver' } }
          ]
        },
        { tag: 'm:sub', children: Array.isArray(under) ? under : [under as OmmlNode] },
        { tag: 'm:sup', children: Array.isArray(over) ? over : [over as OmmlNode] },
        { tag: 'm:e' }
      ]
    };
  }

  // For non-nary operators, use groupChr or nested structures
  return {
    tag: 'm:limLow',
    children: [
      {
        tag: 'm:e',
        children: [{
          tag: 'm:limUpp',
          children: [
            { tag: 'm:e', children: Array.isArray(base) ? base : [base as OmmlNode] },
            { tag: 'm:lim', children: Array.isArray(over) ? over : [over as OmmlNode] }
          ]
        }]
      },
      { tag: 'm:lim', children: Array.isArray(under) ? under : [under as OmmlNode] }
    ]
  };
}

/**
 * Convert fenced expression (mfenced)
 */
function convertFenced(element: Element): OmmlNode[] {
  const open = element.getAttribute('open') || '(';
  const close = element.getAttribute('close') || ')';
  const children = convertChildren(element);

  return [
    createTextRun(open),
    ...children,
    createTextRun(close)
  ];
}

/**
 * Convert table/matrix (mtable)
 */
function convertTable(element: Element): OmmlNode {
  const rows = Array.from(element.querySelectorAll('mtr'));
  
  const ommlRows = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('mtd'));
    const ommlCells = cells.map(cell => {
      const cellChildren = convertChildren(cell);
      return {
        tag: 'm:e',
        children: cellChildren
      };
    });

    return {
      tag: 'm:mr',
      children: ommlCells
    };
  });

  return {
    tag: 'm:m',
    children: ommlRows
  };
}

/**
 * Render OMML node to XML string
 */
function renderOmml(node: OmmlNode): string {
  const { tag, attrs, children } = node;

  // Build attributes string
  let attrsStr = '';
  if (attrs) {
    attrsStr = ' ' + Object.entries(attrs)
      .map(([key, value]) => `${key}="${escapeXml(value)}"`)
      .join(' ');
  }

  // Self-closing tag if no children
  if (!children || children.length === 0) {
    return `<${tag}${attrsStr}/>`;
  }

  // Render children
  const childrenStr = children
    .map(child => {
      if (typeof child === 'string') {
        return escapeXml(child);
      }
      return renderOmml(child);
    })
    .join('');

  return `<${tag}${attrsStr}>${childrenStr}</${tag}>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create fallback OMML when conversion fails
 */
function createFallbackOmml(content: string): string {
  const text = content.replace(/<[^>]+>/g, '').trim();
  return `<m:oMath><m:r><m:t>${escapeXml(text)}</m:t></m:r></m:oMath>`;
}

/**
 * Strip xmlns:m declarations from OMML string
 */
function stripOmmlNamespace(xml: string): string {
  return xml.replace(/\s+xmlns:m="[^"]*"/gi, '');
}

/**
 * Extract inner content from m:oMath wrapper
 */
function stripOuterOmmlWrapper(xml: string): string {
  const trimmed = xml.trim();
  const match = trimmed.match(/^<m:oMath[^>]*>([\s\S]*)<\/m:oMath>$/i);
  return match ? match[1] : trimmed;
}


/**
 * Wrap OMML in proper Word-compatible container
 * For block equations, use m:oMathPara to tell Word it's a math paragraph
 */
export function wrapOmmlForWord(omml: string, isBlock: boolean = false): string {
  const cleaned = stripOmmlNamespace(omml);
  const inner = stripOuterOmmlWrapper(cleaned);

  // Block equations use m:oMathPara for proper display in Word
  if (isBlock) {
    return `<m:oMathPara xmlns:m="${OMML_NS}"><m:oMath>${inner}</m:oMath></m:oMathPara>`;
  }

  // Inline equations use m:oMath
  return `<m:oMath xmlns:m="${OMML_NS}">${inner}</m:oMath>`;
}
