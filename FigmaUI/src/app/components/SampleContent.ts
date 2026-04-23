export const SAMPLE_MARKDOWN = `# GitHub-like Markdown Viewer & Editor

A modern, **production-ready** desktop application for editing and previewing Markdown files with GitHub-faithful rendering.

## Features

This editor provides a complete Markdown editing experience:

- Real-time preview with split-pane view
- GitHub-like rendering and typography
- Syntax highlighting for code blocks
- Light and dark theme support
- Full GFM (GitHub Flavored Markdown) support

### Supported Markdown Elements

#### Text Formatting

You can use **bold text**, *italic text*, ***bold and italic***, ~~strikethrough~~, and \`inline code\`.

#### Lists

Unordered list:
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

Ordered list:
1. First step
2. Second step
3. Third step

#### Task Lists

- [x] Design UI mockups
- [x] Implement editor component
- [x] Add markdown preview
- [ ] Add file system integration
- [ ] Package for Windows

## Code Blocks

Here's a TypeScript example:

\`\`\`typescript
interface MarkdownEditor {
  content: string;
  theme: 'light' | 'dark';
  viewMode: 'split' | 'editor' | 'preview';
}

function renderMarkdown(content: string): string {
  return marked.parse(content);
}
\`\`\`

And a JavaScript example:

\`\`\`javascript
const editor = {
  save: () => console.log('Saving file...'),
  load: (path) => fs.readFileSync(path, 'utf-8')
};
\`\`\`

## Blockquotes

> This is a blockquote. It can contain multiple paragraphs and other markdown elements.
>
> GitHub uses blockquotes for important notes and warnings in documentation.

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Editor | ✅ Done | High |
| Preview | ✅ Done | High |
| Themes | ✅ Done | Medium |
| File I/O | 🚧 In Progress | High |
| Shortcuts | 📋 Planned | Medium |

## Links and Images

Check out the [GitHub Markdown Guide](https://guides.github.com/features/mastering-markdown/) for more information.

![Placeholder Image](https://via.placeholder.com/600x200/0969da/ffffff?text=Markdown+Preview)

## Horizontal Rules

---

## Technical Details

The application is built with:

- **React** for UI components
- **Tailwind CSS** for styling
- **TypeScript** for type safety
- **Electron** for desktop integration
- **react-markdown** with remark-gfm for rendering

### Performance Considerations

1. Virtual scrolling for large documents
2. Debounced preview updates
3. Efficient diff-based rendering
4. Syntax highlighting caching

---

**Last updated:** April 23, 2026
**Version:** 1.0.0
`;
