import type { SiteAdapter } from './base';
import { ChatGPTAdapter } from './chatgpt';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';
import { KimiAdapter } from './kimi';
import { DeepSeekAdapter } from './deepseek';
import { TongyiAdapter } from './tongyi';
import { DoubaoAdapter } from './doubao';
import { ChatGLMAdapter } from './chatglm';
import { GrokAdapter } from './grok';

const adapters: SiteAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new KimiAdapter(),
  new DeepSeekAdapter(),
  new TongyiAdapter(),
  new DoubaoAdapter(),
  new ChatGLMAdapter(),
  new GrokAdapter()
];

export function getAdapter(): SiteAdapter | null {
  const hostname = window.location.hostname;

  for (const adapter of adapters) {
    if (adapter.hostnames.some(h => hostname.includes(h))) {
      return adapter;
    }
  }

  return null;
}

export function getSupportedSites(): string[] {
  return adapters.map(a => a.name);
}

export { type SiteAdapter } from './base';
