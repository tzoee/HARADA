'use client';

import { cn } from '@/lib/utils';
import { Map, CheckSquare } from 'lucide-react';

export type ViewMode = 'map' | 'checklist';

interface ViewModeTabsProps {
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeTabs({ activeMode, onModeChange }: ViewModeTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
      <button
        onClick={() => onModeChange('map')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
          "transition-all duration-150",
          activeMode === 'map'
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
        )}
      >
        <Map className="h-4 w-4" />
        Map
      </button>
      <button
        onClick={() => onModeChange('checklist')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
          "transition-all duration-150",
          activeMode === 'checklist'
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
        )}
      >
        <CheckSquare className="h-4 w-4" />
        Checklist
      </button>
    </div>
  );
}
