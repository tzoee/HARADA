'use client';

import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { Check, Loader2, Ban } from 'lucide-react';
import { useState } from 'react';

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
  const [isHovered, setIsHovered] = useState(false);
  const progressPercent = Math.round(node.progress * 100);
  const isBlocked = node.status === 'blocked';
  const isInheritedBlocked = node.inherited_blocked;

  // Size based on level - Main Goal largest, Activities smallest
  const sizes = {
    1: { width: 180, height: 180, fontSize: 'text-sm', ring: 10, glow: 'shadow-2xl' },
    2: { width: 130, height: 130, fontSize: 'text-xs', ring: 7, glow: 'shadow-xl' },
    3: { width: 95, height: 95, fontSize: 'text-[10px]', ring: 5, glow: 'shadow-lg' },
  };
  const size = sizes[node.level as 1 | 2 | 3] || sizes[3];

  // Status colors with glow effects
  const statusColors = {
    done: { 
      bg: 'from-green-600/30 to-green-800/30', 
      border: 'border-green-500/70', 
      glow: 'shadow-green-500/30',
      ring: '#22c55e'
    },
    in_progress: { 
      bg: 'from-blue-600/30 to-blue-800/30', 
      border: 'border-blue-500/70', 
      glow: 'shadow-blue-500/30',
      ring: '#3b82f6'
    },
    blocked: { 
      bg: 'from-red-600/30 to-red-800/30', 
      border: 'border-red-500/70', 
      glow: 'shadow-red-500/30',
      ring: '#ef4444'
    },
  };
  const colors = statusColors[node.status];

  const statusIcon = {
    done: <Check className="h-3 w-3" />,
    in_progress: <Loader2 className="h-3 w-3 animate-spin" />,
    blocked: <Ban className="h-3 w-3" />,
  };

  // Progress ring calculations
  const radius = size.width / 2 - size.ring;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - node.progress);

  return (
    <div
      className={cn(
        "absolute cursor-pointer",
        "transition-all duration-300 ease-out",
        isFaded && "opacity-20 pointer-events-auto",
        isInheritedBlocked && !isFaded && "opacity-60 saturate-50"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        transform: `translate(-50%, -50%) scale(${isHovered && !isFaded ? 1.08 : 1})`,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect on hover */}
      {isHovered && !isFaded && (
        <div 
          className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-50 transition-opacity duration-300",
            node.status === 'done' && "bg-green-500/30",
            node.status === 'in_progress' && "bg-blue-500/30",
            node.status === 'blocked' && "bg-red-500/30"
          )}
        />
      )}

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
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth={size.ring}
        />
        {/* Progress ring */}
        <circle
          cx={size.width / 2}
          cy={size.height / 2}
          r={radius}
          fill="none"
          stroke={isInheritedBlocked ? '#64748b' : colors.ring}
          strokeWidth={size.ring}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: isHovered && !isFaded ? `drop-shadow(0 0 8px ${colors.ring})` : undefined
          }}
        />
      </svg>

      {/* Node Content */}
      <div
        className={cn(
          "absolute rounded-full flex flex-col items-center justify-center",
          "bg-gradient-to-br backdrop-blur-md",
          "border-2 transition-all duration-300",
          colors.bg,
          colors.border,
          size.glow,
          colors.glow,
          isSelected && "ring-2 ring-white/60 ring-offset-2 ring-offset-slate-950",
          node.level === 1 && "border-3"
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
          node.status === 'blocked' && "text-red-400",
          isInheritedBlocked && "text-slate-400"
        )}>
          {statusIcon[node.status]}
          <span className={cn("font-bold", size.fontSize)}>{progressPercent}%</span>
        </div>

        {/* Title */}
        <span className={cn(
          "text-white text-center leading-tight line-clamp-2 px-2",
          size.fontSize,
          isInheritedBlocked && "text-slate-300"
        )}>
          {node.title}
        </span>

        {/* Level badge for L1 */}
        {node.level === 1 && (
          <span className="absolute -bottom-2 text-[9px] text-blue-300 bg-blue-900/80 px-3 py-0.5 rounded-full border border-blue-500/30">
            Main Goal
          </span>
        )}

        {/* Level badge for L2 */}
        {node.level === 2 && !isFaded && (
          <span className="absolute -bottom-1 text-[8px] text-slate-400">
            Sub Goal
          </span>
        )}
      </div>

      {/* Inherited blocked tooltip */}
      {isInheritedBlocked && isHovered && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800/95 text-xs text-slate-300 px-3 py-1.5 rounded-lg whitespace-nowrap z-50 border border-slate-700 shadow-lg">
          <span className="text-red-400">⚠</span> Blocked by Sub Goal
        </div>
      )}
    </div>
  );
}
