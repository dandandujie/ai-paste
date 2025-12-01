import { getSettings, getCurrentPreset } from '@/utils/storage';
import type { Message, ConvertRequest } from '@/types';

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();

  chrome.contextMenus.create({
    id: 'ai-paste-convert',
    title: 'AI-Paste: 转换选中内容',
    contexts: ['selection']
  });
});

// 点击扩展图标时，向当前页面发送消息显示浮窗
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' });
    } catch {
      // 如果 content script 未加载，尝试注入
      console.log('Content script not loaded, injecting...');
    }
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ai-paste-convert' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_CONVERT' });
  }
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case 'GET_SETTINGS':
      return getSettings();

    case 'CONVERT_CONTENT': {
      const request = message.payload as ConvertRequest;
      return convertContent(request);
    }

    case 'WRITE_CLIPBOARD': {
      const { html, plainText } = message.payload as { html: string; plainText: string };
      await writeToClipboard(html, plainText);
      return { success: true };
    }

    default:
      return null;
  }
}

async function convertContent(request: ConvertRequest) {
  const { convertMarkdown } = await import('@/lib/markdown-converter');
  const { applyStyles } = await import('@/lib/style-applier');
  const preset = await getCurrentPreset();

  let html: string;
  if (request.sourceType === 'markdown') {
    html = await convertMarkdown(request.content);
  } else {
    html = request.content;
  }

  const styledHtml = applyStyles(html, preset);
  const plainText = stripHtml(request.content);

  return {
    html: styledHtml,
    plainText,
    hasFormula: request.content.includes('$') || request.content.includes('\\(')
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

let offscreenDocumentCreated = false;

async function writeToClipboard(html: string, plainText: string) {
  if (!offscreenDocumentCreated) {
    try {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('src/offscreen/index.html'),
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'Write formatted content to clipboard'
      });
      offscreenDocumentCreated = true;
    } catch (e) {
      if (!(e as Error).message.includes('already exists')) {
        throw e;
      }
      offscreenDocumentCreated = true;
    }
  }

  await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'CLIPBOARD_WRITE',
    data: { html, plainText }
  });
}
