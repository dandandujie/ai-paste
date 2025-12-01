export interface StylePreset {
  id: string;
  name: string;
  body: BodyStyle;
  headings: HeadingStyles;
  code: CodeStyle;
  table: TableStyle;
  list: ListStyle;
}

export interface BodyStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  color: string;
  paragraphSpacing: string;
}

export interface HeadingStyles {
  h1: HeadingStyle;
  h2: HeadingStyle;
  h3: HeadingStyle;
  h4: HeadingStyle;
  h5: HeadingStyle;
  h6: HeadingStyle;
}

export interface HeadingStyle {
  fontSize: string;
  fontWeight: string;
  marginTop: string;
  marginBottom: string;
  color: string;
}

export interface CodeStyle {
  fontFamily: string;
  fontSize: string;
  backgroundColor: string;
  textColor: string;
  padding: string;
  borderRadius: string;
  enableHighlight: boolean;
}

export interface TableStyle {
  borderWidth: string;
  borderColor: string;
  headerBgColor: string;
  headerTextColor: string;
  cellPadding: string;
  alternateRowBg: boolean;
  alternateRowColor: string;
}

export interface ListStyle {
  indent: string;
  bulletStyle: 'disc' | 'circle' | 'square';
  numberStyle: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';
  itemSpacing: string;
}

export interface AppSettings {
  enabled: boolean;
  autoIntercept: boolean;
  currentPresetId: string;
  presets: StylePreset[];
  showNotification: boolean;
  showFloatingPanel: boolean;
}

export interface ConvertedContent {
  html: string;
  plainText: string;
  hasFormula: boolean;
}

export interface SiteAdapter {
  name: string;
  hostname: string[];
  extractContent(selection: Selection): string | null;
  getMessageContainer(element: Element): Element | null;
}

export type MessageType =
  | 'CONVERT_CONTENT'
  | 'WRITE_CLIPBOARD'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'MANUAL_CONVERT'
  | 'CHECK_PANDOC'
  | 'CONVERT_TO_DOCX';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface ConvertRequest {
  content: string;
  sourceType: 'markdown' | 'html';
  presetId?: string;
}
