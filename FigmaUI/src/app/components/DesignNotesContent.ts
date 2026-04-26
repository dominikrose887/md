export const DESIGN_NOTES = `# MD Studio - Design & Implementation Notes

## Overview
A GitHub-like Markdown Viewer & Editor for Windows desktop (Electron + React + Tailwind CSS).

## Design Principles

### Visual Style
- **Inspiration**: GitHub web UI - clean, minimal, developer-focused
- **Typography**: System sans-serif for UI, monospace for code
- **Color Palette**: Neutral grayscale + GitHub-like blue accents (#0969da light, #58a6ff dark)
- **Approach**: Content density over decoration, utilitarian design

### Target Platform
- **OS**: Windows desktop (Electron shell)
- **Default window**: 1280×800px
- **Minimum size**: 960×640px
- **Responsive**: Yes, handles window resizing

## Layout Structure

### 1. Top Toolbar (48px height)
Components:
- App branding: "MD Studio" with icon
- File actions: Open, Save, Save As
- View mode toggle: Split / Editor Only / Preview Only
- Theme toggle: Light/Dark
- Window controls: Minimize, Maximize, Close

Styling:
- Padding: 16px horizontal
- Gap: 16px between sections
- Border: 1px bottom

### 2. Main Content Area (Flexible)
**Split Pane Layout** (default 50/50):

**Left Pane - Editor:**
- Line numbers: 48px width, right-aligned
- Editor padding: 16px
- Font: 14px monospace, 1.5 line-height
- Background: Slightly muted for line numbers
- Syntax: Plain text (optional: subtle MD syntax coloring)

**Right Pane - Preview:**
- Padding: 32px
- Max content width: 896px (centered)
- Font: 16px system, 1.6 line-height
- GitHub markdown styles applied

**Resizable Divider:**
- Width: 4px
- Hover state: Primary color overlay
- Min panel size: 30% of viewport

### 3. Status Bar (28px height)
Left section:
- File path (truncated if > 60 chars)
- Unsaved indicator: "● Unsaved changes" (amber)

Right section:
- Cursor position: "Ln X, Col Y"
- Encoding: "UTF-8"
- Line ending: "LF" or "CRLF"

Styling:
- Font: 12px
- Padding: 16px horizontal
- Background: Subtle accent

## Color System

### Light Theme
\`\`\`css
--background: #FFFFFF
--foreground: #030213
--primary: #030213
--muted: #ECECF0
--accent: #E9EBEF
--border: rgba(0,0,0,0.1)
--destructive: #D4183D
--link: #0969da
\`\`\`

### Dark Theme
\`\`\`css
--background: #24242A
--foreground: #FAFAFA
--primary: #FAFAFA
--muted: #3E3E47
--accent: #3E3E47
--border: #3E3E47
--link: #58a6ff
\`\`\`

## Typography

### UI Text
- Font stack: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Toolbar/buttons: 14-16px
- Body: 16px
- Status bar: 12px

### Code/Editor
- Font stack: ui-monospace, SF Mono, Menlo, Consolas, monospace
- Size: 14px
- Line height: 1.5
- Tab size: 2 spaces

### Markdown Preview
- Headings: 32px, 24px, 20px, 16px (H1-H4)
- Body: 16px, 1.6 line-height
- Code: 85% of body size
- Font weight: 600 for headings, 400 for body

## Spacing System
Based on 8px grid:
- xs: 4px (0.5 unit)
- sm: 8px (1 unit)
- md: 16px (2 units)
- lg: 24px (3 units)
- xl: 32px (4 units)

## Component Specifications

### Buttons
**Primary:**
- Background: var(--primary)
- Color: var(--primary-foreground)
- Padding: 8px 16px
- Border radius: 6px
- Hover: 90% opacity

**Secondary/Ghost:**
- Background: transparent or var(--accent)
- Color: var(--foreground)
- Padding: 8px 16px
- Hover: var(--accent)

**Icon Button:**
- Size: 32px × 32px
- Padding: 8px
- Border radius: 6px
- Hover: var(--accent)

### Segmented Control (View Mode)
- Container: var(--muted) background, 4px padding, 6px radius
- Active segment: var(--background), shadow
- Inactive segment: transparent, hover overlay
- Transition: all properties, 150ms

### Status Badges
- Saved: Green background/text
- Unsaved: Amber background/text with circle icon
- Error: Red background/text
- Padding: 4px 8px
- Font size: 12px
- Border radius: 4px

## Markdown Preview Styling

### GitHub-like Elements
All elements match GitHub rendering:
- H1/H2: Bottom border
- Code blocks: Syntax highlighting, 6px radius
- Inline code: 20% gray background, 6px radius
- Blockquotes: Left border, muted text
- Tables: Striped rows, bordered cells
- Task lists: Checkbox styling
- Links: Blue (#0969da / #58a6ff)

### Code Syntax Highlighting
- Light theme: One Light (Prism)
- Dark theme: One Dark (Prism)
- Languages: Auto-detected from fence markers

## User Flows & States

### 1. Empty State
- No file open
- Centered message with icon
- "Open File" CTA button
- Keyboard shortcut hint (Ctrl+O)

### 2. File Open (Split View)
- Editor shows content with line numbers
- Preview shows rendered markdown
- Status bar shows file path, cursor position
- Toolbar "Save" disabled (no changes yet)

### 3. Editing with Unsaved Changes
- Content modified in editor
- Preview updates in real-time
- Status bar: "● Unsaved changes" (amber)
- Toolbar "Save" button enabled

### 4. Save Success
- Toast notification: "File saved successfully"
- Status cleared
- Save button disabled again

### 5. Error State
- Centered error message
- Error icon (destructive color)
- Explanation text
- "Try Again" button
- Technical error details (monospace)

### 6. View Modes
- Split: Both panes visible
- Editor Only: Full-width editor
- Preview Only: Full-width preview

### 7. Theme Toggle
- Instant switch between light/dark
- All colors transition smoothly
- Markdown syntax highlighting updates
- Persisted preference (demo only)

## Keyboard Shortcuts
- Ctrl+O: Open file
- Ctrl+S: Save file
- Ctrl+Shift+S: Save as
- Ctrl+W: Close file (concept)

## Implementation Notes

### Technology Stack
\`\`\`json
{
  "framework": "React 18",
  "styling": "Tailwind CSS v4",
  "desktop": "Electron (future)",
  "markdown": "react-markdown + remark-gfm",
  "syntax": "react-syntax-highlighter",
  "panels": "react-resizable-panels"
}
\`\`\`

### File Structure
\`\`\`
src/
├── app/
│   ├── App.tsx              # Main app container
│   └── components/
│       ├── Toolbar.tsx       # Top toolbar
│       ├── Editor.tsx        # Markdown editor
│       ├── Preview.tsx       # Rendered preview
│       ├── StatusBar.tsx     # Bottom status
│       ├── EmptyState.tsx    # No file open
│       ├── ErrorState.tsx    # Error display
│       └── ...
└── styles/
    ├── markdown.css          # GitHub-like MD styles
    ├── theme.css             # Color tokens
    └── index.css             # Main imports
\`\`\`

### State Management
Local React state:
- \`theme\`: 'light' | 'dark'
- \`viewMode\`: 'split' | 'editor' | 'preview'
- \`content\`: Current markdown text
- \`fileName\`: Active file name
- \`filePath\`: Full file path
- \`hasUnsavedChanges\`: Boolean flag

### Accessibility Considerations
- High contrast in both themes
- Keyboard navigation support
- Focus states on all interactive elements
- ARIA labels where appropriate
- Semantic HTML structure

### Performance
- Debounced preview updates (real-time typing)
- Efficient diff-based rendering
- Virtual scrolling for large docs (future)
- Code highlighting memoization

## Design Tokens (CSS Variables)

### Recommended Token Names
\`\`\`css
/* Colors */
--md-bg-primary
--md-bg-secondary
--md-text-primary
--md-text-muted
--md-border
--md-accent
--md-error

/* Spacing */
--md-space-xs: 4px
--md-space-sm: 8px
--md-space-md: 16px
--md-space-lg: 24px

/* Typography */
--md-font-ui
--md-font-mono
--md-text-sm: 14px
--md-text-base: 16px

/* Layout */
--md-toolbar-height: 48px
--md-statusbar-height: 28px
--md-border-radius: 6px
\`\`\`

## Future Enhancements
1. File system integration (Electron APIs)
2. Search and replace in editor
3. Word/character count
4. Export to HTML/PDF
5. Custom CSS themes
6. Plugin system for extensions
7. Git integration indicators
8. Multi-file tabs

## Testing Checklist
- [x] Light/dark theme switching
- [x] All view modes functional
- [x] Resizable panels work smoothly
- [x] Status bar updates correctly
- [x] Unsaved changes detection
- [x] Error states display properly
- [x] Markdown rendering matches GitHub
- [x] Code syntax highlighting works
- [x] Responsive at min size (960×640)
- [x] Keyboard shortcuts functional

---

**Design Version**: 1.1.0
**Last Updated**: April 23, 2026
**Implementation**: Production-ready prototype
`;
