import { FileEdit, Eye, Palette, Zap, GitBranch, Settings } from 'lucide-react';

export function WelcomeScreen() {
  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-8">
      <div className="max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <FileEdit className="w-12 h-12 text-primary" />
            <h1 className="text-5xl">MD Studio</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            GitHub-like Markdown Viewer & Editor
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            A production-ready desktop application prototype for Windows (React + Electron)
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <FeatureCard
            icon={<Eye className="w-6 h-6" />}
            title="Live Preview"
            description="Real-time Markdown rendering with GitHub-faithful formatting, typography, and code highlighting"
          />
          <FeatureCard
            icon={<Palette className="w-6 h-6" />}
            title="Themes"
            description="Light and dark themes matching GitHub's aesthetic with smooth transitions"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Split View"
            description="Flexible layout with draggable panes - split, editor-only, or preview-only modes"
          />
          <FeatureCard
            icon={<GitBranch className="w-6 h-6" />}
            title="GFM Support"
            description="Full GitHub Flavored Markdown support including tables, task lists, and syntax highlighting"
          />
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            Interactive Prototype
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use the <strong className="text-foreground">Demo Controls</strong> button (bottom-right corner) to explore different UI states:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 ml-4">
            <li>• <strong className="text-foreground">Design System Docs</strong> - View complete design specifications</li>
            <li>• <strong className="text-foreground">Empty State</strong> - See the initial no-file-open experience</li>
            <li>• <strong className="text-foreground">Split Views</strong> - Test light/dark themes with working editor</li>
            <li>• <strong className="text-foreground">View Modes</strong> - Try editor-only and preview-only layouts</li>
            <li>• <strong className="text-foreground">Error States</strong> - See file loading error handling</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-8 text-xs text-muted-foreground">
            <div>
              <div className="font-semibold mb-1">Target Platform</div>
              <div>Windows Desktop</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="font-semibold mb-1">Tech Stack</div>
              <div>React + Tailwind + Electron</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="font-semibold mb-1">Default Size</div>
              <div>1280 × 800px</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-primary mt-1">{icon}</div>
        <div>
          <h3 className="mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
