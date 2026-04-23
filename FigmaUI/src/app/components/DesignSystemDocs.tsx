import { FileEdit, Save, FileOpen, Moon, Sun } from 'lucide-react';

export function DesignSystemDocs() {
  return (
    <div className="h-full overflow-auto bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="mb-8">MD Studio - Design System</h1>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Color Palette</h2>

          <div className="mb-6">
            <h3 className="mb-3">Light Theme</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorSwatch name="Background" color="var(--background)" hex="#FFFFFF" />
              <ColorSwatch name="Foreground" color="var(--foreground)" hex="#030213" />
              <ColorSwatch name="Primary" color="var(--primary)" hex="#030213" />
              <ColorSwatch name="Muted" color="var(--muted)" hex="#ECECF0" />
              <ColorSwatch name="Accent" color="var(--accent)" hex="#E9EBEF" />
              <ColorSwatch name="Border" color="var(--border)" hex="rgba(0,0,0,0.1)" />
              <ColorSwatch name="Destructive" color="var(--destructive)" hex="#D4183D" />
              <ColorSwatch name="GitHub Blue" color="#0969da" hex="#0969da" />
            </div>
          </div>

          <div>
            <h3 className="mb-3">Dark Theme</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorSwatch name="Background" color="oklch(0.145 0 0)" hex="#24242A" />
              <ColorSwatch name="Foreground" color="oklch(0.985 0 0)" hex="#FAFAFA" />
              <ColorSwatch name="Primary" color="oklch(0.985 0 0)" hex="#FAFAFA" />
              <ColorSwatch name="Muted" color="oklch(0.269 0 0)" hex="#3E3E47" />
              <ColorSwatch name="Accent" color="oklch(0.269 0 0)" hex="#3E3E47" />
              <ColorSwatch name="Border" color="oklch(0.269 0 0)" hex="#3E3E47" />
              <ColorSwatch name="GitHub Blue" color="#58a6ff" hex="#58a6ff" />
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Typography</h2>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">UI Font Family</div>
              <div className="font-mono text-sm">-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Code Font Family</div>
              <div className="font-mono text-sm">ui-monospace, "SF Mono", Menlo, Consolas, monospace</div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-muted-foreground mb-3">Type Scale</div>
              <div style={{ fontSize: '32px', lineHeight: '1.25' }}>H1 Heading - 32px / 2em</div>
              <div style={{ fontSize: '24px', lineHeight: '1.25' }}>H2 Heading - 24px / 1.5em</div>
              <div style={{ fontSize: '20px', lineHeight: '1.25' }}>H3 Heading - 20px / 1.25em</div>
              <div style={{ fontSize: '16px', lineHeight: '1.25' }}>H4 Heading - 16px / 1em</div>
              <div style={{ fontSize: '16px', lineHeight: '1.6' }}>Body Text - 16px / 1.6 line-height</div>
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>Small Text - 14px</div>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>Caption - 12px</div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Spacing System</h2>
          <div className="text-sm text-muted-foreground mb-4">Based on 8px grid system</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SpacingBox size={4} label="4px / 0.5 unit" />
            <SpacingBox size={8} label="8px / 1 unit" />
            <SpacingBox size={12} label="12px / 1.5 units" />
            <SpacingBox size={16} label="16px / 2 units" />
            <SpacingBox size={24} label="24px / 3 units" />
            <SpacingBox size={32} label="32px / 4 units" />
            <SpacingBox size={48} label="48px / 6 units" />
            <SpacingBox size={64} label="64px / 8 units" />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Components</h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3">Buttons</h3>
              <div className="flex gap-3 flex-wrap">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  Primary Button
                </button>
                <button className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/80">
                  Secondary Button
                </button>
                <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90">
                  Destructive Button
                </button>
                <button className="px-4 py-2 border border-border rounded hover:bg-accent">
                  Outline Button
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-3">Icon Buttons</h3>
              <div className="flex gap-3">
                <button className="p-2 rounded hover:bg-accent" title="File">
                  <FileEdit className="w-4 h-4" />
                </button>
                <button className="p-2 rounded hover:bg-accent" title="Open">
                  <FileOpen className="w-4 h-4" />
                </button>
                <button className="p-2 rounded hover:bg-accent" title="Save">
                  <Save className="w-4 h-4" />
                </button>
                <button className="p-2 rounded hover:bg-accent" title="Theme">
                  <Moon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-3">Segmented Control (View Modes)</h3>
              <div className="inline-flex items-center gap-1 bg-muted rounded p-1">
                <button className="px-3 py-1.5 rounded text-sm bg-background shadow-sm">Split</button>
                <button className="px-3 py-1.5 rounded text-sm hover:bg-background/50">Editor</button>
                <button className="px-3 py-1.5 rounded text-sm hover:bg-background/50">Preview</button>
              </div>
            </div>

            <div>
              <h3 className="mb-3">Status Badges</h3>
              <div className="flex gap-3 items-center">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded text-xs">
                  Saved
                </span>
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 rounded text-xs">
                  ● Unsaved
                </span>
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded text-xs">
                  Error
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Layout Specifications</h2>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-semibold mb-1">Toolbar</div>
                <div className="text-muted-foreground font-mono text-xs space-y-0.5">
                  <div>Height: 48px (3 units)</div>
                  <div>Padding: 16px horizontal</div>
                  <div>Border: 1px bottom</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">Status Bar</div>
                <div className="text-muted-foreground font-mono text-xs space-y-0.5">
                  <div>Height: 28px</div>
                  <div>Padding: 16px horizontal</div>
                  <div>Font size: 12px</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">Editor Pane</div>
                <div className="text-muted-foreground font-mono text-xs space-y-0.5">
                  <div>Line numbers: 48px width</div>
                  <div>Padding: 16px</div>
                  <div>Font: 14px monospace</div>
                  <div>Line height: 1.5</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">Preview Pane</div>
                <div className="text-muted-foreground font-mono text-xs space-y-0.5">
                  <div>Padding: 32px</div>
                  <div>Max width: 896px (56 units)</div>
                  <div>Font: 16px system</div>
                  <div>Line height: 1.6</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Border Radius</h2>
          <div className="flex gap-4 items-end">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary mb-2" style={{ borderRadius: '4px' }} />
              <div className="text-xs text-muted-foreground">4px - Small</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary mb-2" style={{ borderRadius: '6px' }} />
              <div className="text-xs text-muted-foreground">6px - Default</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary mb-2" style={{ borderRadius: '10px' }} />
              <div className="text-xs text-muted-foreground">10px - Large</div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 pb-2 border-b border-border">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <ShortcutRow shortcut="Ctrl+O" description="Open file" />
            <ShortcutRow shortcut="Ctrl+S" description="Save file" />
            <ShortcutRow shortcut="Ctrl+Shift+S" description="Save as" />
            <ShortcutRow shortcut="Ctrl+W" description="Close file" />
            <ShortcutRow shortcut="Ctrl+," description="Settings" />
            <ShortcutRow shortcut="Ctrl+/" description="Toggle comment" />
          </div>
        </section>
      </div>
    </div>
  );
}

function ColorSwatch({ name, color, hex }: { name: string; color: string; hex: string }) {
  return (
    <div>
      <div
        className="h-16 rounded border border-border mb-2"
        style={{ backgroundColor: color }}
      />
      <div className="text-xs font-medium">{name}</div>
      <div className="text-xs text-muted-foreground font-mono">{hex}</div>
    </div>
  );
}

function SpacingBox({ size, label }: { size: number; label: string }) {
  return (
    <div>
      <div className="bg-primary/20 border-2 border-primary border-dashed mb-2" style={{ height: size, width: size }} />
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-accent">
      <span className="text-muted-foreground">{description}</span>
      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{shortcut}</kbd>
    </div>
  );
}
