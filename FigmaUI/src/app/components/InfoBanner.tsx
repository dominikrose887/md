import { Info } from 'lucide-react';

export function InfoBanner() {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <strong className="text-blue-900 dark:text-blue-100">Interactive Prototype</strong>
          <p className="text-blue-800 dark:text-blue-200 mt-1">
            This is a fully functional UI prototype demonstrating the GitHub-like Markdown Editor.
            Use the <strong>Demo Controls</strong> button (bottom-right) to explore different states and features.
          </p>
        </div>
      </div>
    </div>
  );
}
