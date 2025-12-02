/**
 * 构造包含 HTML/纯文本的剪贴板项
 * 如果 HTML 已经是完整文档（包含 <!DOCTYPE 或 <html），直接使用
 * 否则包装为 Word 兼容的 HTML 文档
 */
export function buildClipboardItem(html: string, plainText: string): ClipboardItem {
  // 检查是否已经是完整的 HTML 文档
  const isCompleteDocument = html.trim().startsWith('<!DOCTYPE') || html.trim().startsWith('<html');

  const finalHtml = isCompleteDocument ? html : wrapHtmlForWord(html);

  return new ClipboardItem({
    'text/html': new Blob([finalHtml], { type: 'text/html' }),
    'text/plain': new Blob([plainText], { type: 'text/plain' })
  });
}

/**
 * 将 HTML 片段包装为 Word 兼容的完整文档
 * 添加完整的命名空间和元数据，提高 Windows Word 兼容性
 */
function wrapHtmlForWord(html: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
      xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="AI-Paste">
</head>
<body>
<!--StartFragment-->
${html}
<!--EndFragment-->
</body>
</html>`;
}
