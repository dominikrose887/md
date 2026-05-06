import { X } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from './ui/context-menu';

export interface TabItem {
  id: string;
  title: string;
  path: string;
  unsaved: boolean;
  conflict?: boolean;
}

interface TabStripProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOthers: (tabId: string) => void;
  onCloseRight: (tabId: string) => void;
  onRenameTab: (tabId: string) => void;
  onReorderTabs: (fromTabId: string, toTabId: string) => void;
}

export function TabStrip({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onCloseOthers,
  onCloseRight,
  onRenameTab,
  onReorderTabs
}: TabStripProps) {
  if (!tabs.length) {
    return null;
  }

  return (
    <div className="h-10 border-b border-border bg-muted/40 flex items-center overflow-x-auto px-2 gap-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const rightTabs = tabs.slice(tabs.findIndex((item) => item.id === tab.id) + 1);
        const canCloseRight = rightTabs.length > 0;
        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/mdstudio-tab-id', tab.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedTabId = event.dataTransfer.getData('text/mdstudio-tab-id');
                  if (draggedTabId && draggedTabId !== tab.id) {
                    onReorderTabs(draggedTabId, tab.id);
                  }
                }}
                onClick={() => onActivateTab(tab.id)}
                className={`group max-w-[260px] min-w-[140px] h-8 rounded-md border text-sm flex items-center gap-2 px-3 transition-colors ${
                  isActive
                    ? 'bg-background border-border text-foreground shadow-sm'
                    : 'bg-muted border-transparent text-muted-foreground hover:bg-background/70'
                }`}
                title={tab.path}
              >
                <span
                  className={`inline-block size-2 rounded-full ${
                    tab.conflict
                      ? 'bg-red-500'
                      : tab.unsaved
                        ? 'bg-amber-500'
                        : 'bg-transparent border border-muted-foreground/40'
                  }`}
                />
                <span className="truncate flex-1 text-left">{tab.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onCloseTab(tab.id);
                    }
                  }}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={`Close ${tab.title}`}
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onActivateTab(tab.id)}>Activate</ContextMenuItem>
              <ContextMenuItem onClick={() => onRenameTab(tab.id)}>Rename tab</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onCloseTab(tab.id)}>Close</ContextMenuItem>
              <ContextMenuItem onClick={() => onCloseOthers(tab.id)}>Close all but this</ContextMenuItem>
              <ContextMenuItem disabled={!canCloseRight} onClick={() => onCloseRight(tab.id)}>
                Close tabs to the right
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
