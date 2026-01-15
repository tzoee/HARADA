'use client';

import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { Check, Loader2, Ban, ChevronDown, Lock } from 'lucide-react';
import { useState } from 'react';

interface CanvasNodeProps {
  node: NodeWithProgress;
  position: { x: number; y: number };
  isSelected: boolean;
  isFaded: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onHover?: (nodeId: string | null) => void;
}

export function CanvasNode({
  node,
  position,
  isSelected,
  isFaded,
  onClick,
  onDoubleClick,
  onHover,
}: CanvasNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const progressPercent = Math.round(node.progress * 100);
  const isInheritedBlocked = node.inherited_blocked;
  const isBlocked = node.status === 'blocked';
  const isAnyBlocked = isBlocked || isInheritedBlocked;

  // Visual hierarchy: scale based on level
  const levelConfig = {
    1: { 
      baseScale: 1, 
      hoverScale: 1.03,
      size: 180, 
      ring: 10, 
      opacity: 1,
      glowIntensity: 'shadow-2xl',
      fontSize: 'text-sm'
    },
    2: { 
      baseScale: 0.85, 
      hoverScale: 0.95,
      size: 140, 
      ring: 7, 
      opacity: 0.92,
      glowIntensity: 'shadow-xl',
      fontSize: 'text-xs'
    },
    3: { 
      baseScale: 0.75, 
      hoverScale: 0.82,
      size: 100, 
      ring: 5, 
      opacity: 0.85,
      glowIntensity: 'shadow-lg',
      fontSize: 'text-[10px]'
    },
  };
  const config = levelConfig[node.level as 1 | 2 | 3] || levelConfig[3];

  // Status colors with glow
  const statusColors = {
    done: { 
      bg: 'from-green-600/25 to-green-900/35', 
      border: 'border-green-500/60', 
      glow: 'rgba(34, 197, 94, 0.4)',
      ring: '#22c55e',
      text: 'text-green-400'
    },
    in_progress: { 
      bg: 'from-blue-600/25 to-blue-900/35', 
      border: 'border-blue-500/60', 
      glow: 'rgba(59, 130, 246, 0.4)',
      ring: '#3b82f6',
      text: 'text-blue-400'
    },
    blocked: { 
      bg: 'from-red-600/25 to-red-900/35', 
      border: 'border-red-500/60', 
      glow: 'rgba(239, 68, 68, 0.4)',
      ring: '#ef4444',
      text: 'text-red-400'
    },
  };
  const colors = statusColors[node.status];

  const statusIcon = {
    done: <Check className="h-3 w-3" />,
    in_progress: <Loader2 className="h-3 w-3 animate-spin" />,
    blocked: <Ban className="h-3 w-3" />,
  };

  // Progress ring calculations
  const radius = config.size / 2 - config.ring;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - node.progress);

  // Calculate final scale and opacity
  const finalScale = isHovered && !isFaded ? config.hoverScale : config.baseScale;
  const finalOpacity = isFaded ? 0.35 : (isHovered ? 1 : config.opacity);
  const liftY = isHovered && !isFaded ? -3 : 0;

  // Handle click with shake animation for blocked nodes
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInheritedBlocked) {
      // Trigger shake animation for inherited blocked nodes
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }
    onClick();
  };

  // Shake animation keyframes (inline style)
  const shakeTransform = isShaking 
    ? 'translate(-50%, -50%) scale(' + finalScale + ') translateX(var(--shake-x, 0px))'
    : `translate(-50%, -50%) scale(${finalScale}) translateY(${liftY}px)`;

  return (
    <div
      className={cn("absolute cursor-pointer", isShaking && "animate-shake")}
      style={{
        left: position.x,
        top: position.y,
        width: config.size,
        height: config.size,
        transform: shakeTransform,
        opacity: isAnyBlocked && !isFaded ? (isInheritedBlocked ? 0.5 : 0.7) : finalOpacity,
        transition: isShaking ? undefined : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out',
        filter: isAnyBlocked ? `saturate(${isInheritedBlocked ? 0.3 : 0.5})` : undefined,
        // CSS custom property for shake animation
        ['--shake-x' as string]: '0px',
      }}
      onClick={handleClick}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
      onMouseEnter={() => { setIsHovered(true); onHover?.(node.id); }}
      onMouseLeave={() => { setIsHovered(false); onHover?.(null); }}
      data-node-id={node.id}
    >
      {/* Glow layer */}
      <div 
        className="absolute inset-0 rounded-full blur-xl transition-opacity duration-200"
        style={{
          background: isAnyBlocked ? 'rgba(100, 116, 139, 0.2)' : colors.glow,
          opacity: isAnyBlocked ? 0.15 : (isHovered && !isFaded ? 0.6 : (node.level === 1 ? 0.35 : 0.2)),
        }}
      />

      {/* Diagonal stripe pattern overlay for blocked nodes */}
      {isBlocked && (
        <svg className="absolute inset-0 rounded-full overflow-hidden" width={config.size} height={config.size}>
          <defs>
            <pattern id={`stripes-${node.id}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(239, 68, 68, 0.25)" strokeWidth="4" />
            </pattern>
            <clipPath id={`circle-clip-${node.id}`}>
              <circle cx={config.size / 2} cy={config.size / 2} r={config.size / 2 - config.ring} />
            </clipPath>
          </defs>
          <rect width={config.size} height={config.size} fill={`url(#stripes-${node.id})`} clipPath={`url(#circle-clip-${node.id})`} />
        </svg>
      )}

      {/* Progress Ring SVG */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={config.size}
        height={config.size}
        onMouseEnter={() => setShowProgressTooltip(true)}
        onMouseLeave={() => setShowProgressTooltip(false)}
      >
        {/* Background ring */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.15)"
          strokeWidth={config.ring}
        />
        {/* Progress ring with smooth transition */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={isInheritedBlocked ? '#64748b' : colors.ring}
          strokeWidth={config.ring}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            filter: isHovered && !isFaded ? `drop-shadow(0 0 6px ${colors.ring})` : undefined,
          }}
        />
      </svg>

      {/* Progress tooltip - shows on ring hover for Level 3 with checklist */}
      {showProgressTooltip && node.level === 3 && node.progress_from_checklist && (
        <div 
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-[10px] text-slate-300 px-2.5 py-1 rounded-md whitespace-nowrap z-50 border border-slate-700/50"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          📋 Progress from {node.checklist_count} checklist items
        </div>
      )}

      {/* Node Content */}
      <div
        className={cn(
          "absolute rounded-full flex flex-col items-center justify-center",
          "bg-gradient-to-br backdrop-blur-md",
          "border-2 transition-all duration-200",
          colors.bg,
          colors.border,
          config.glowIntensity,
          isSelected && "ring-2 ring-white/50 ring-offset-2 ring-offset-slate-950"
        )}
        style={{
          left: config.ring,
          top: config.ring,
          right: config.ring,
          bottom: config.ring,
          boxShadow: isHovered && !isFaded 
            ? `0 0 20px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)` 
            : `inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Status & Progress */}
        <div className={cn(
          "flex items-center gap-1 mb-0.5",
          colors.text,
          isAnyBlocked && "text-slate-400"
        )}>
          {statusIcon[node.status]}
          <span className={cn("font-bold tabular-nums", config.fontSize)}>
            {progressPercent}%
          </span>
          {/* Lock icon for blocked nodes */}
          {isBlocked && (
            <Lock className="h-2.5 w-2.5 ml-0.5 text-red-400/80" />
          )}
        </div>

        {/* Title */}
        <span className={cn(
          "text-white text-center leading-tight line-clamp-2 px-2",
          config.fontSize,
          isAnyBlocked && "text-slate-300"
        )}>
          {node.title}
        </span>

        {/* Level 1 badge */}
        {node.level === 1 && (
          <span className="absolute -bottom-2 text-[9px] text-blue-300/90 bg-blue-950/80 px-3 py-0.5 rounded-full border border-blue-500/20">
            Main Goal
          </span>
        )}

        {/* Level 2 affordance hint - shows on hover */}
        {node.level === 2 && isHovered && !isFaded && (
          <div className="absolute -bottom-1 flex items-center gap-0.5 text-[8px] text-slate-400 transition-opacity duration-150">
            <ChevronDown className="h-2.5 w-2.5" />
            <span>8 Activities</span>
          </div>
        )}
      </div>

      {/* Inherited blocked tooltip */}
      {isInheritedBlocked && isHovered && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 text-[11px] text-slate-300 px-3 py-1.5 rounded-lg whitespace-nowrap z-50 border border-slate-700/50"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          <span className="text-red-400 mr-1">🔒</span>Blocked by Sub Goal
          <div className="text-[9px] text-slate-500 mt-0.5">Unblock parent to proceed</div>
        </div>
      )}

      {/* Blocked node tooltip */}
      {isBlocked && !isInheritedBlocked && isHovered && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 text-[11px] text-slate-300 px-3 py-1.5 rounded-lg whitespace-nowrap z-50 border border-red-900/50"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          <span className="text-red-400 mr-1">⛔</span>This goal is blocked
        </div>
      )}

      {/* Shake animation style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) scale(${finalScale}) translateX(0); }
          20% { transform: translate(-50%, -50%) scale(${finalScale}) translateX(-3px); }
          40% { transform: translate(-50%, -50%) scale(${finalScale}) translateX(3px); }
          60% { transform: translate(-50%, -50%) scale(${finalScale}) translateX(-2px); }
          80% { transform: translate(-50%, -50%) scale(${finalScale}) translateX(2px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
