'use client';

import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { ProgressRing } from '@/components/progress-ring';

interface MandalaCenterProps {
  node: NodeWithProgress;
  onClick: () => void;
  isSelected: boolean;
}

export function MandalaCenter({ node, onClick, isSelected }: MandalaCenterProps) {
  const progressPercent = Math.round(node.progress * 100);

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "w-40 h-40 rounded-full",
        "bg-gradient-to-br from-blue-600 to-blue-800",
        "border-4 border-blue-400/50",
        "shadow-lg shadow-blue-500/30",
        "flex flex-col items-center justify-center gap-2",
        "transition-all duration-300 hover:scale-105",
        "cursor-pointer z-20",
        isSelected && "ring-4 ring-blue-300 ring-offset-2 ring-offset-slate-900"
      )}
    >
      {/* Progress Ring */}
      <div className="absolute -top-2 -right-2">
        <ProgressRing progress={node.progress} size={40} strokeWidth={3} />
      </div>

      {/* Title */}
      <span className="text-white font-bold text-center px-3 text-sm leading-tight line-clamp-3">
        {node.title}
      </span>

      {/* Progress Percentage */}
      <span className="text-blue-200 text-xs font-medium">
        {progressPercent}%
      </span>
    </button>
  );
}
