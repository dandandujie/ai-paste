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
 */
function wrapHtmlForWord(html: string): string {
  const OMML_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  const OFFICE_NAMESPACE = 'urn:schemas-microsoft-com:office:office';
  const WORD_NAMESPACE = 'urn:schemas-microsoft-com:office:word';

  return `<html xmlns:o="${OFFICE_NAMESPACE}" xmlns:w="${WORD_NAMESPACE}" xmlns:m="${OMML_NAMESPACE}">
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>
<body>
<!--StartFragment-->
${html}
<!--EndFragment-->
</body>
</html>`;
}
