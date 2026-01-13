'use client';

import { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { Check, Loader2, Ban, ChevronDown } from 'lucide-react';

interface MandalaNodeProps {
  node: NodeWithProgress;
  style: CSSProperties;
  onClick: () => void;
  onExpand?: () => void;
  isSelected: boolean;
  isExpanded?: boolean;
  isOuter?: boolean;
}

export function MandalaNode({
  node,
  style,
  onClick,
  onExpand,
  isSelected,
  isExpanded,
  isOuter = false,
}: MandalaNodeProps) {
  const progressPercent = Math.round(node.progress * 100);

  const statusIcon = {
    done: <Check className="h-3 w-3 text-green-400" />,
    in_progress: <Loader2 className="h-3 w-3 text-blue-400" />,
    blocked: <Ban className="h-3 w-3 text-red-400" />,
  };

  const statusColors = {
    done: 'border-green-500/50 bg-green-500/10',
    in_progress: 'border-blue-500/50 bg-blue-500/10',
    blocked: 'border-red-500/50 bg-red-500/10',
  };

  return (
    <div
      style={style}
      className={cn(
        "z-10 relative",
        isOuter ? "w-24 h-24" : "w-28 h-28"
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "w-full h-full rounded-xl",
          "bg-slate-800/90 backdrop-blur-sm",
          "border-2",
          statusColors[node.status],
          "shadow-lg",
          "flex flex-col items-center justify-center gap-1 p-2",
          "transition-all duration-200 hover:scale-105 hover:shadow-xl",
          "cursor-pointer",
          isSelected && "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900",
          node.inherited_blocked && "opacity-60"
        )}
      >
        {/* Status Icon & Progress */}
        <div className="flex items-center gap-1">
          {statusIcon[node.status]}
          <span className={cn(
            "text-xs font-bold",
            node.status === 'done' && "text-green-400",
            node.status === 'in_progress' && "text-blue-400",
            node.status === 'blocked' && "text-red-400"
          )}>
            {progressPercent}%
          </span>
        </div>

        {/* Title */}
        <span className={cn(
          "text-white text-center leading-tight line-clamp-2",
          isOuter ? "text-[10px]" : "text-xs"
        )}>
          {node.title}
        </span>

        {/* Level indicator */}
        <span className="text-slate-500 text-[9px]">
          L{node.level}
        </span>
      </button>

      {/* Expand button for Level 2 nodes */}
      {onExpand && node.level === 2 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className={cn(
            "absolute -bottom-3 left-1/2 -translate-x-1/2",
            "w-6 h-6 rounded-full",
            "bg-slate-700 border border-slate-600",
            "flex items-center justify-center",
            "hover:bg-slate-600 transition-all",
            isExpanded && "rotate-180"
          )}
        >
          <ChevronDown className="h-3 w-3 text-slate-300" />
        </button>
      )}
    </div>
  );
}
