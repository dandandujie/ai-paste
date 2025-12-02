# AI-Paste

[中文](./README.md)

A browser extension that enables seamless pasting of AI chat content into Word, Excel, WPS and other office applications.

## Background

As a college student who frequently uses AI tools, I often encountered frustrating issues: copying AI-generated content directly into Word resulted in messy formatting and broken formula rendering. This inspired me to develop this tool.

I chose to build a browser extension rather than a desktop application because most mainstream browsers support Chrome extensions, which avoids cross-platform compatibility issues between Windows, macOS, etc.

The name **AI-Paste** reflects its purpose in AI-assisted workflows.

## Features

- **Rich Text Preservation**: Headings, lists, tables, code blocks and other formatting are fully preserved
- **Math Formula Support**: LaTeX formulas are automatically converted to Office-compatible format (OMML), allowing direct editing in Word/WPS
- **Wide Compatibility**: Works with mainstream AI chat platforms

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
3. Paste directly into Word or WPS

The extension automatically handles content formatting, including:
- Text styles (bold, italic, headings)
- Code blocks (with syntax highlighting)
- Tables
- Math formulas (converted to editable equations)
- Lists and nested structures

## Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3
- KaTeX
- Marked
- Highlight.js

## License

This project is licensed under the [Apache License 2.0](LICENSE).
