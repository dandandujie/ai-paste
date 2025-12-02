# AI-Paste（爱粘贴）

[English](./README_EN.md)

一款浏览器扩展，让 AI 对话内容可以完美粘贴到 Word、WPS中。

## 项目背景

作为一名日常使用 AI 工具的大学生，我经常遇到这样的困扰：直接复制 AI 输出的内容粘贴到 Word 时，格式混乱、公式无法渲染。于是萌生了开发这款工具的想法。

选择浏览器扩展而非桌面程序，是因为主流浏览器都支持 Chrome 扩展，可以避免 Windows、macOS 等跨平台适配问题。

项目名 **AI-Paste**，谐音"爱粘贴"，也代表了它在 AI 场景下的使用定位。

## 功能特性

- **富文本格式保留**：标题、列表、表格、代码块等格式完整保留
- **数学公式支持**：LaTeX 公式自动转换为 Office 兼容格式（OMML），粘贴到 Word/WPS 后可直接编辑
- **广泛兼容**：适配主流 AI 对话平台

## 重要提示

> ⚠️ **推荐使用 Microsoft Word**
>
> 本扩展针对 **Microsoft Word** 优化，公式可完美渲染为可编辑格式。
>
> **WPS 用户请注意**：虽然项目提供了WPS模式，但WPS（尤其是 Mac 版）对公式格式支持有限，可能出现公式显示异常、格式错乱等问题。

## 安装使用

### 方式一：直接下载（推荐）

1. 前往 [Releases](https://github.com/dandandujie/ai-paste/releases) 页面下载最新版本的 `dist.zip`
2. 解压到任意文件夹
3. 打开 Chrome 浏览器，访问 `chrome://extensions/`
4. 开启右上角「开发者模式」
5. 点击「加载已解压的扩展程序」，选择解压后的文件夹

### 方式二：从源码构建

```bash
git clone https://github.com/dandandujie/ai-paste.git
cd ai-paste
npm install
npm run build
```

构建完成后，按上述步骤加载 `dist` 文件夹即可。

## 使用方法

1. 打开任意 AI 对话网站
2. 选中需要复制的内容
3. 直接粘贴到 Word 或 WPS

扩展会自动处理内容格式，包括：
- 文本样式（加粗、斜体、标题）
- 代码块（带语法高亮）
- 表格
- 数学公式（转换为可编辑公式）
- 列表及嵌套结构

## 技术栈

- TypeScript
- Vite
- Chrome Extension Manifest V3
- KaTeX
- Marked
- Highlight.js

## 开源协议

本项目采用 [Apache License 2.0](LICENSE) 开源协议。
