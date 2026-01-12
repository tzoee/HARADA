'use client';

import { forwardRef, KeyboardEvent } from 'react';
import { Check, Loader2, Ban } from 'lucide-react';
import type { NodeWithProgress } from '@/types/computed';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NodePillarCardProps {
  node: NodeWithProgress;
  isSelected: boolean;
  isFocused: boolean;
  isOnFocusedPath: boolean;
  onClick: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
}

export function NodePillarCard({
  node,
  isSelected,
  isFocused,
  isOnFocusedPath,
  onClick,
  onKeyDown,
  tabIndex = 0,
}: NodePillarCardProps) {
  const progressPercent = Math.round(node.progress * 100);

  // Status icon and color
  const statusConfig = {
    done: {
      icon: Check,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      label: 'Done',
    },
    in_progress: {
      icon: Loader2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      label: 'In Progress',
    },
    blocked: {
      icon: Ban,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      label: 'Blocked',
    },
  };

  const status = node.inherited_blocked ? 'blocked' : node.status;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Build accessible label
  const ariaLabel = `${node.title}, Level ${node.level}, ${config.label}, ${progressPercent}% complete${node.inherited_blocked ? ', blocked by Level 2 ancestor' : ''}`;

  return (
    <button
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      role="treeitem"
      aria-selected={isSelected}
      aria-label={ariaLabel}
      aria-describedby={node.inherited_blocked ? `blocked-${node.id}` : undefined}
      className={cn(
        // Base styles - glassy dark UI
        "relative w-28 min-h-[80px] p-2 rounded-lg",
        "bg-gradient-to-b from-slate-800/90 to-slate-900/90",
        "backdrop-blur-sm border border-slate-700/50",
        "shadow-lg shadow-black/20",
        "transition-all duration-200 ease-out",
        "flex flex-col items-center justify-center gap-1",
        "text-left cursor-pointer",
        // Hover glow effect
        "hover:shadow-xl hover:shadow-primary/10",
        "hover:border-primary/30",
        "hover:scale-105",
        // Selected state
        isSelected && "ring-2 ring-primary border-primary/50 scale-105",
        // Focused state
        isFocused && "ring-2 ring-yellow-400 border-yellow-400/50",
        // On focused path
        isOnFocusedPath && !isSelected && !isFocused && "border-primary/30",
        // Inherited blocked styling
        node.inherited_blocked && "opacity-60"
      )}
    >
      {/* Progress ring background */}
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <div 
          className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all duration-300"
          style={{ height: `${progressPercent}%` }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center gap-1">
        {/* Status badge */}
        <Badge 
          variant="outline" 
          className={cn(
            "h-5 px-1.5 text-[10px] font-medium",
            config.bgColor,
            config.borderColor,
            config.color
          )}
        >
          <StatusIcon className={cn("w-3 h-3 mr-0.5", status === 'in_progress' && "animate-spin")} />
          {progressPercent}%
        </Badge>

        {/* Title */}
        <span className="text-xs font-medium text-slate-200 text-center line-clamp-2 leading-tight">
          {node.title}
        </span>

        {/* Level indicator */}
        <span className="text-[10px] text-slate-500">
          L{node.level}
        </span>

        {/* Inherited blocked indicator */}
        {node.inherited_blocked && (
          <span 
            id={`blocked-${node.id}`}
            className="text-[9px] text-red-400/80 font-medium"
            aria-hidden="true"
          >
            Blocked by L2
          </span>
        )}
      </div>
    </button>
  );
}
