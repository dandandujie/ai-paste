# AI-Paste

A browser extension that enables copying AI chat content with proper formatting for Word, Excel, and WPS.

## Features

- **Rich Text Formatting**: Preserves headings, lists, tables, code blocks, and other formatting when pasting into office applications
- **Math Formula Support**: Converts LaTeX formulas to Office-compatible format (OMML), enabling direct paste into Word/WPS with editable equations
- **Multi-Platform Support**: Works with popular AI assistants:
  - ChatGPT
  - Claude
  - Gemini
  - Kimi
  - DeepSeek
  - Doubao (豆包)
  - Tongyi Qianwen (通义千问)
  - ChatGLM (智谱清言)
  - Grok

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/dandandujie/ai-paste.git
   cd ai-paste
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Navigate to any supported AI chat platform
2. Select the content you want to copy
3. Use the copy button or Ctrl+C / Cmd+C
4. Paste directly into Word, Excel, or WPS

The extension automatically converts the content to a format that preserves:
- Text formatting (bold, italic, headings)
- Code blocks with syntax highlighting
- Tables
- Mathematical formulas (as editable equations)
- Lists and nested structures

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build main bundle only
npm run build:main

# Build content script only
npm run build:content
```

## Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3
- KaTeX (for math rendering)
- Marked (for Markdown parsing)
- Highlight.js (for code highlighting)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
