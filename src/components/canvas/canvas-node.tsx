'use client';

import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { Check, Loader2, Ban } from 'lucide-react';

interface CanvasNodeProps {
  node: NodeWithProgress;
  position: { x: number; y: number };
  isSelected: boolean;
  isFaded: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export function CanvasNode({
  node,
  position,
  isSelected,
  isFaded,
  onClick,
  onDoubleClick,
}: CanvasNodeProps) {
  const progressPercent = Math.round(node.progress * 100);
  const isBlocked = node.status === 'blocked';
  const isInheritedBlocked = node.inherited_blocked;

  // Size based on level
  const sizes = {
    1: { width: 160, height: 160, fontSize: 'text-sm', ring: 8 },
    2: { width: 120, height: 120, fontSize: 'text-xs', ring: 6 },
    3: { width: 90, height: 90, fontSize: 'text-[10px]', ring: 4 },
  };
  const size = sizes[node.level as 1 | 2 | 3] || sizes[3];

  // Status colors
  const statusColors = {
    done: { bg: 'from-green-600/20 to-green-800/20', border: 'border-green-500/60', glow: 'shadow-green-500/20' },
    in_progress: { bg: 'from-blue-600/20 to-blue-800/20', border: 'border-blue-500/60', glow: 'shadow-blue-500/20' },
    blocked: { bg: 'from-red-600/20 to-red-800/20', border: 'border-red-500/60', glow: 'shadow-red-500/20' },
  };
  const colors = statusColors[node.status];

  const statusIcon = {
    done: <Check className="h-3 w-3" />,
    in_progress: <Loader2 className="h-3 w-3 animate-spin" />,
    blocked: <Ban className="h-3 w-3" />,
  };

  // Progress ring
  const circumference = 2 * Math.PI * (size.width / 2 - size.ring);
  const strokeDashoffset = circumference * (1 - node.progress);

  return (
    <div
      className={cn(
        "absolute cursor-pointer transition-all duration-300",
        isFaded && "opacity-30 pointer-events-none",
        isInheritedBlocked && "opacity-50"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
    >
      {/* Progress Ring */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size.width}
        height={size.height}
      >
        {/* Background ring */}
        <circle
          cx={size.width / 2}
          cy={size.height / 2}
          r={size.width / 2 - size.ring}
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth={size.ring}
        />
        {/* Progress ring */}
        <circle
          cx={size.width / 2}
          cy={size.height / 2}
          r={size.width / 2 - size.ring}
          fill="none"
          stroke={isBlocked ? '#ef4444' : isInheritedBlocked ? '#64748b' : node.status === 'done' ? '#22c55e' : '#3b82f6'}
          strokeWidth={size.ring}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>

      {/* Node Content */}
      <div
        className={cn(
          "absolute rounded-full flex flex-col items-center justify-center",
          "bg-gradient-to-br backdrop-blur-sm",
          "border-2 transition-all duration-200",
          "hover:scale-105 hover:shadow-xl",
          colors.bg,
          colors.border,
          colors.glow,
          "shadow-lg",
          isSelected && "ring-2 ring-white/50 ring-offset-2 ring-offset-slate-950",
          node.level === 1 && "shadow-2xl"
        )}
        style={{
          left: size.ring,
          top: size.ring,
          right: size.ring,
          bottom: size.ring,
        }}
      >
        {/* Status & Progress */}
        <div className={cn(
          "flex items-center gap-1 mb-1",
          node.status === 'done' && "text-green-400",
          node.status === 'in_progress' && "text-blue-400",
          node.status === 'blocked' && "text-red-400"
        )}>
          {statusIcon[node.status]}
          <span className={cn("font-bold", size.fontSize)}>{progressPercent}%</span>
        </div>

        {/* Title */}
        <span className={cn(
          "text-white text-center leading-tight line-clamp-2 px-2",
          size.fontSize
        )}>
          {node.title}
        </span>

        {/* Level badge for L1 */}
        {node.level === 1 && (
          <span className="absolute -bottom-1 text-[9px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            Main Goal
          </span>
        )}
      </div>

      {/* Inherited blocked tooltip */}
      {isInheritedBlocked && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-slate-300 px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
          Blocked by Sub Goal
        </div>
      )}
    </div>
  );
}
