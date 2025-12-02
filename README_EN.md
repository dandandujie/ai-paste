# AI-Paste

[中文](./README.md)

A browser extension that enables seamless pasting of AI chat content into Word, Excel, WPS and other office applications.

## Background

As a college student who frequently uses AI tools, I often encountered frustrating issues: copying AI-generated content directly into Word resulted in messy formatting and broken formula rendering. This inspired me to develop this tool.

I chose to build a browser extension rather than a desktop application because most mainstream browsers support Chrome extensions, which avoids cross-platform compatibility issues between Windows, macOS, etc.

The name **AI-Paste** reflects its purpose in AI-assisted workflows.

## Features

- **Rich Text Preservation**: Headings, lists, tables, code blocks and other formatting are fully preserved
- **Math Formula Support**: LaTeX formulas are automatically converted to Office-compatible format, allowing direct editing in Word
- **Multi-Select Marking**: Select and mark multiple text sections to apply different fonts and sizes
- **Resizable Panel**: Drag the bottom-left corner to resize the floating panel
- **Wide Compatibility**: Works with mainstream AI chat platforms

## Important Notes

> ⚠️ **Microsoft Word Recommended**
>
> This extension is optimized for **Microsoft Word**. Formulas render perfectly as editable equations.
>
> **WPS Users**: WPS (especially Mac version) has limited formula format support. You may experience formula display issues or formatting problems. If you encounter issues, switch "Target App" to "WPS" mode in the floating panel.

> ⚠️ **Use Keyboard Shortcuts to Copy**
>
> Please use **Ctrl+C (Windows)** or **Cmd+C (Mac)** to copy content manually.
>
> The built-in "Copy" button on AI websites may not trigger this extension, resulting in lost formatting.

## Installation

### Option 1: Direct Download (Recommended)

1. Go to the [Releases](https://github.com/dandandujie/ai-paste/releases) page and download the latest `dist.zip`
2. Extract to any folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the extracted folder

### Option 2: Build from Source

```bash
git clone https://github.com/dandandujie/ai-paste.git
cd ai-paste
npm install
npm run build
```

After building, load the `dist` folder following the steps above.

## Usage

1. Open any AI chat website
2. Select the content you want to copy
3. Use **Ctrl+C / Cmd+C** to copy (recommended for best results)
4. Adjust font, size, and other settings in the floating panel
5. Click "Copy Formatted Content"
6. Paste into Word or WPS

### Format Settings

- **Target App**: Choose Word or WPS (WPS mode converts formulas to text format)
- **Font/Size/Line Height**: Set global formatting
- **Multi-Select Marking**: Select text and click "+Mark" to mark multiple sections, then apply formatting to all
- **Reset Format**: Restore default format (SimSun, 12pt, 1.5x line height)

## Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3
- KaTeX
- Marked
- Highlight.js

## License

This project is licensed under the [Apache License 2.0](LICENSE).
