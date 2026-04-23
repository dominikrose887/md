import { Settings } from 'lucide-react';
import { useState } from 'react';

interface DemoControlsProps {
  onDemoStateChange: (state: string) => void;
  currentState: string;
}

export function DemoControls({ onDemoStateChange, currentState }: DemoControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const demoStates = [
    { id: 'welcome', label: '🏠 Welcome Screen' },
    { id: 'design-system', label: '🎨 Design System Docs' },
    { id: 'design-notes', label: '📋 Implementation Notes' },
    { id: 'empty', label: 'Empty State (No File)' },
    { id: 'split-light', label: 'Split View - Light Theme' },
    { id: 'split-dark', label: 'Split View - Dark Theme' },
    { id: 'editor-only', label: 'Editor Only Mode' },
    { id: 'preview-only', label: 'Preview Only Mode' },
    { id: 'unsaved', label: 'Unsaved Changes' },
    { id: 'error', label: 'Error State' },
    { id: 'success-toast', label: 'Success Notification' },
  ];

  return (
    <div className="fixed bottom-20 right-6 z-50">
      {isOpen && (
        <div className="mb-2 bg-card border border-border rounded-lg shadow-lg p-2 w-64">
          <div className="text-xs font-semibold mb-2 px-2 pt-1 text-muted-foreground">
            Demo State Selector
          </div>
          <div className="max-h-96 overflow-y-auto">
            {demoStates.map((state) => (
              <button
                key={state.id}
                onClick={() => {
                  onDemoStateChange(state.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors ${
                  currentState === state.id ? 'bg-accent' : ''
                }`}
              >
                {state.label}
                {currentState === state.id && (
                  <span className="ml-2 text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-all"
        title="Demo Controls"
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
}
