import type { StylePreset } from '@/types';

const OMML_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

export function applyStyles(html: string, preset: StylePreset): string {
  const css = generateCSS(preset);

  const wordCompatibleHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:m="${OMML_NS}"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
${css}
  </style>
</head>
<body class="ai-paste-content" xmlns:m="${OMML_NS}">
<!--StartFragment-->${html}<!--EndFragment-->
</body>
</html>`.trim();

  return wordCompatibleHtml;
}

function generateCSS(preset: StylePreset): string {
  const { body, headings, code, table, list } = preset;

  return `
    .ai-paste-content {
      font-family: ${body.fontFamily};
      font-size: ${body.fontSize};
      line-height: ${body.lineHeight};
      color: ${body.color};
    }

    .md-paragraph {
      margin: 0 0 ${body.paragraphSpacing} 0;
      font-family: ${body.fontFamily};
      font-size: ${body.fontSize};
      line-height: ${body.lineHeight};
      color: ${body.color};
    }

    .md-h1 {
      font-size: ${headings.h1.fontSize};
      font-weight: ${headings.h1.fontWeight};
      margin-top: ${headings.h1.marginTop};
      margin-bottom: ${headings.h1.marginBottom};
      color: ${headings.h1.color};
    }

    .md-h2 {
      font-size: ${headings.h2.fontSize};
      font-weight: ${headings.h2.fontWeight};
      margin-top: ${headings.h2.marginTop};
      margin-bottom: ${headings.h2.marginBottom};
      color: ${headings.h2.color};
    }

    .md-h3 {
      font-size: ${headings.h3.fontSize};
      font-weight: ${headings.h3.fontWeight};
      margin-top: ${headings.h3.marginTop};
      margin-bottom: ${headings.h3.marginBottom};
      color: ${headings.h3.color};
    }

    .md-h4 {
      font-size: ${headings.h4.fontSize};
      font-weight: ${headings.h4.fontWeight};
      margin-top: ${headings.h4.marginTop};
      margin-bottom: ${headings.h4.marginBottom};
      color: ${headings.h4.color};
    }

    .md-h5 {
      font-size: ${headings.h5.fontSize};
      font-weight: ${headings.h5.fontWeight};
      margin-top: ${headings.h5.marginTop};
      margin-bottom: ${headings.h5.marginBottom};
      color: ${headings.h5.color};
    }

    .md-h6 {
      font-size: ${headings.h6.fontSize};
      font-weight: ${headings.h6.fontWeight};
      margin-top: ${headings.h6.marginTop};
      margin-bottom: ${headings.h6.marginBottom};
      color: ${headings.h6.color};
    }

    .code-block {
      font-family: ${code.fontFamily};
      font-size: ${code.fontSize};
      background-color: ${code.backgroundColor};
      color: ${code.textColor};
      padding: ${code.padding};
      border-radius: ${code.borderRadius};
      margin: 8pt 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .code-block code {
      font-family: ${code.fontFamily};
      font-size: ${code.fontSize};
      background: transparent;
      padding: 0;
    }

    .md-code-inline {
      font-family: ${code.fontFamily};
      font-size: ${code.fontSize};
      background-color: ${code.backgroundColor};
      color: ${code.textColor};
      padding: 2px 4px;
      border-radius: 3px;
    }

    .md-table {
      border-collapse: collapse;
      width: 100%;
      margin: 8pt 0;
      border: ${table.borderWidth} solid ${table.borderColor};
    }

    .md-table th,
    .md-table td {
      border: ${table.borderWidth} solid ${table.borderColor};
      padding: ${table.cellPadding};
      text-align: left;
    }

    .md-table th {
      background-color: ${table.headerBgColor};
      color: ${table.headerTextColor};
      font-weight: bold;
    }

    ${table.alternateRowBg ? `
    .md-table tr:nth-child(even) {
      background-color: ${table.alternateRowColor};
    }
    ` : ''}

    .md-blockquote {
      margin: 8pt 0;
      padding: 8pt 16pt;
      border-left: 4px solid #ddd;
      background-color: #f9f9f9;
      color: #666;
    }

    ul, ol {
      margin: 8pt 0;
      padding-left: ${list.indent};
    }

    ul {
      list-style-type: ${list.bulletStyle};
    }

    ol {
      list-style-type: ${list.numberStyle};
    }

    .md-list-item {
      margin-bottom: ${list.itemSpacing};
    }

    .md-link {
      color: #0066cc;
      text-decoration: underline;
    }

    .md-strong {
      font-weight: bold;
    }

    .md-em {
      font-style: italic;
    }

    .math-block, .math-inline {
      font-family: "Cambria Math", "Times New Roman", serif;
      font-style: italic;
    }

    /* Highlight.js 基础样式 */
    .hljs-keyword { color: #0000ff; }
    .hljs-string { color: #a31515; }
    .hljs-comment { color: #008000; }
    .hljs-number { color: #098658; }
    .hljs-function { color: #795e26; }
    .hljs-title { color: #267f99; }
    .hljs-params { color: #001080; }
    .hljs-built_in { color: #267f99; }
    .hljs-literal { color: #0000ff; }
    .hljs-attr { color: #e50000; }
    .hljs-selector-tag { color: #800000; }
    .hljs-selector-class { color: #800000; }
  `.trim();
}

export function inlineStyles(html: string): string {
  return html;
}
