const i="http://schemas.openxmlformats.org/officeDocument/2006/math";function m(l,e){const o=a(e);return`
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:m="${i}"
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
${o}
  </style>
</head>
<body class="ai-paste-content" xmlns:m="${i}">
<!--StartFragment-->${l}<!--EndFragment-->
</body>
</html>`.trim()}function a(l){const{body:e,headings:o,code:t,table:n,list:r}=l;return`
    .ai-paste-content {
      font-family: ${e.fontFamily};
      font-size: ${e.fontSize};
      line-height: ${e.lineHeight};
      color: ${e.color};
    }

    .md-paragraph {
      margin: 0 0 ${e.paragraphSpacing} 0;
      font-family: ${e.fontFamily};
      font-size: ${e.fontSize};
      line-height: ${e.lineHeight};
      color: ${e.color};
    }

    .md-h1 {
      font-size: ${o.h1.fontSize};
      font-weight: ${o.h1.fontWeight};
      margin-top: ${o.h1.marginTop};
      margin-bottom: ${o.h1.marginBottom};
      color: ${o.h1.color};
    }

    .md-h2 {
      font-size: ${o.h2.fontSize};
      font-weight: ${o.h2.fontWeight};
      margin-top: ${o.h2.marginTop};
      margin-bottom: ${o.h2.marginBottom};
      color: ${o.h2.color};
    }

    .md-h3 {
      font-size: ${o.h3.fontSize};
      font-weight: ${o.h3.fontWeight};
      margin-top: ${o.h3.marginTop};
      margin-bottom: ${o.h3.marginBottom};
      color: ${o.h3.color};
    }

    .md-h4 {
      font-size: ${o.h4.fontSize};
      font-weight: ${o.h4.fontWeight};
      margin-top: ${o.h4.marginTop};
      margin-bottom: ${o.h4.marginBottom};
      color: ${o.h4.color};
    }

    .md-h5 {
      font-size: ${o.h5.fontSize};
      font-weight: ${o.h5.fontWeight};
      margin-top: ${o.h5.marginTop};
      margin-bottom: ${o.h5.marginBottom};
      color: ${o.h5.color};
    }

    .md-h6 {
      font-size: ${o.h6.fontSize};
      font-weight: ${o.h6.fontWeight};
      margin-top: ${o.h6.marginTop};
      margin-bottom: ${o.h6.marginBottom};
      color: ${o.h6.color};
    }

    .code-block {
      font-family: ${t.fontFamily};
      font-size: ${t.fontSize};
      background-color: ${t.backgroundColor};
      color: ${t.textColor};
      padding: ${t.padding};
      border-radius: ${t.borderRadius};
      margin: 8pt 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .code-block code {
      font-family: ${t.fontFamily};
      font-size: ${t.fontSize};
      background: transparent;
      padding: 0;
    }

    .md-code-inline {
      font-family: ${t.fontFamily};
      font-size: ${t.fontSize};
      background-color: ${t.backgroundColor};
      color: ${t.textColor};
      padding: 2px 4px;
      border-radius: 3px;
    }

    .md-table {
      border-collapse: collapse;
      width: 100%;
      margin: 8pt 0;
      border: ${n.borderWidth} solid ${n.borderColor};
    }

    .md-table th,
    .md-table td {
      border: ${n.borderWidth} solid ${n.borderColor};
      padding: ${n.cellPadding};
      text-align: left;
    }

    .md-table th {
      background-color: ${n.headerBgColor};
      color: ${n.headerTextColor};
      font-weight: bold;
    }

    ${n.alternateRowBg?`
    .md-table tr:nth-child(even) {
      background-color: ${n.alternateRowColor};
    }
    `:""}

    .md-blockquote {
      margin: 8pt 0;
      padding: 8pt 16pt;
      border-left: 4px solid #ddd;
      background-color: #f9f9f9;
      color: #666;
    }

    ul, ol {
      margin: 8pt 0;
      padding-left: ${r.indent};
    }

    ul {
      list-style-type: ${r.bulletStyle};
    }

    ol {
      list-style-type: ${r.numberStyle};
    }

    .md-list-item {
      margin-bottom: ${r.itemSpacing};
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
  `.trim()}export{m as applyStyles};
