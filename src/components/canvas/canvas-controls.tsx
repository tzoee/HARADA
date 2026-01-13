'use client';

import { ZoomIn, ZoomOut, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function CanvasControls({ zoom, onZoomIn, onZoomOut, onReset }: CanvasControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
      {/* Zoom percentage */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center border border-slate-700">
        <span className="text-sm font-medium text-slate-300">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Control buttons */}
      <div className="flex flex-col bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
        <button
          onClick={onZoomIn}
          className={cn(
            "p-3 hover:bg-slate-700/50 transition-colors",
            "border-b border-slate-700"
          )}
          title="Zoom In"
        >
          <ZoomIn className="h-5 w-5 text-slate-300" />
        </button>
        <button
          onClick={onZoomOut}
          className={cn(
            "p-3 hover:bg-slate-700/50 transition-colors",
            "border-b border-slate-700"
          )}
          title="Zoom Out"
        >
          <ZoomOut className="h-5 w-5 text-slate-300" />
        </button>
        <button
          onClick={onReset}
          className="p-3 hover:bg-slate-700/50 transition-colors"
          title="Fit to Main Goal"
        >
          <Home className="h-5 w-5 text-slate-300" />
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/70 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-slate-400 border border-slate-700/50 max-w-[140px]">
        <p>Drag to pan</p>
        <p>Scroll to zoom</p>
        <p>Double-click to focus</p>
      </div>
    </div>
  );
}
