import type { AppSettings, StylePreset } from '@/types';

const DEFAULT_PRESET: StylePreset = {
  id: 'default',
  name: '默认',
  body: {
    fontFamily: '微软雅黑, Arial, sans-serif',
    fontSize: '12pt',
    lineHeight: '1.6',
    color: '#333333',
    paragraphSpacing: '8pt'
  },
  headings: {
    h1: { fontSize: '22pt', fontWeight: 'bold', marginTop: '16pt', marginBottom: '8pt', color: '#1a1a1a' },
    h2: { fontSize: '18pt', fontWeight: 'bold', marginTop: '14pt', marginBottom: '6pt', color: '#1a1a1a' },
    h3: { fontSize: '14pt', fontWeight: 'bold', marginTop: '12pt', marginBottom: '4pt', color: '#1a1a1a' },
    h4: { fontSize: '12pt', fontWeight: 'bold', marginTop: '10pt', marginBottom: '4pt', color: '#333333' },
    h5: { fontSize: '11pt', fontWeight: 'bold', marginTop: '8pt', marginBottom: '4pt', color: '#333333' },
    h6: { fontSize: '10pt', fontWeight: 'bold', marginTop: '8pt', marginBottom: '4pt', color: '#666666' }
  },
  code: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '10pt',
    backgroundColor: '#f5f5f5',
    textColor: '#333333',
    padding: '8px',
    borderRadius: '4px',
    enableHighlight: true
  },
  table: {
    borderWidth: '1px',
    borderColor: '#dddddd',
    headerBgColor: '#f0f0f0',
    headerTextColor: '#333333',
    cellPadding: '6px',
    alternateRowBg: true,
    alternateRowColor: '#fafafa'
  },
  list: {
    indent: '24pt',
    bulletStyle: 'disc',
    numberStyle: 'decimal',
    itemSpacing: '4pt'
  }
};

const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  autoIntercept: true,
  currentPresetId: 'default',
  presets: [DEFAULT_PRESET],
  showNotification: true,
  showFloatingPanel: true
};

export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.sync.get('settings');
  if (!result.settings) {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  // 合并默认值，确保新字段有默认值
  const settings = { ...DEFAULT_SETTINGS, ...result.settings } as AppSettings;
  return settings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.sync.set({ settings });
}

export async function getCurrentPreset(): Promise<StylePreset> {
  const settings = await getSettings();
  const preset = settings.presets.find(p => p.id === settings.currentPresetId);
  return preset || settings.presets[0] || DEFAULT_PRESET;
}

export async function savePreset(preset: StylePreset): Promise<void> {
  const settings = await getSettings();
  const index = settings.presets.findIndex(p => p.id === preset.id);
  if (index >= 0) {
    settings.presets[index] = preset;
  } else {
    settings.presets.push(preset);
  }
  await saveSettings(settings);
}

export async function deletePreset(presetId: string): Promise<void> {
  if (presetId === 'default') return;
  const settings = await getSettings();
  settings.presets = settings.presets.filter(p => p.id !== presetId);
  if (settings.currentPresetId === presetId) {
    settings.currentPresetId = 'default';
  }
  await saveSettings(settings);
}

export function exportPresets(presets: StylePreset[]): string {
  return JSON.stringify(presets, null, 2);
}

export function importPresets(json: string): StylePreset[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid preset format');
  }
  return parsed as StylePreset[];
}

export { DEFAULT_PRESET, DEFAULT_SETTINGS };
