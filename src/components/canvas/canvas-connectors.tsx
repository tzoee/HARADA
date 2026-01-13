'use client';

import type { NodeWithProgress } from '@/types/computed';

interface CanvasConnectorsProps {
  rootNode: NodeWithProgress;
  level2Nodes: NodeWithProgress[];
  level3Nodes: NodeWithProgress[];
  nodePositions: Map<string, { x: number; y: number }>;
  focusedSubGoalId: string | null;
}

export function CanvasConnectors({
  rootNode,
  level2Nodes,
  level3Nodes,
  nodePositions,
  focusedSubGoalId,
}: CanvasConnectorsProps) {
  const rootPos = nodePositions.get(rootNode.id) || { x: 0, y: 0 };

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: -1000,
        top: -1000,
        width: 2000,
        height: 2000,
      }}
    >
      <defs>
        {/* Gradient for active connectors */}
        <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
        </linearGradient>
        {/* Gradient for blocked connectors */}
        <linearGradient id="blockedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.2" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Level 1 to Level 2 connectors */}
      {level2Nodes.map(node => {
        const nodePos = nodePositions.get(node.id);
        if (!nodePos) return null;

        const isFaded = focusedSubGoalId !== null && focusedSubGoalId !== node.id;
        const isBlocked = node.status === 'blocked' || node.inherited_blocked;

        return (
          <line
            key={`l1-l2-${node.id}`}
            x1={rootPos.x + 1000}
            y1={rootPos.y + 1000}
            x2={nodePos.x + 1000}
            y2={nodePos.y + 1000}
            stroke={isBlocked ? 'url(#blockedGradient)' : 'url(#activeGradient)'}
            strokeWidth={isFaded ? 1 : 2}
            strokeDasharray={isBlocked ? '8 4' : undefined}
            opacity={isFaded ? 0.2 : 1}
            filter={!isFaded && !isBlocked ? 'url(#glow)' : undefined}
            className="transition-all duration-300"
          />
        );
      })}

      {/* Level 2 to Level 3 connectors (only when focused) */}
      {focusedSubGoalId && level3Nodes.map(node => {
        const parentPos = nodePositions.get(focusedSubGoalId);
        const nodePos = nodePositions.get(node.id);
        if (!parentPos || !nodePos) return null;

        const isBlocked = node.status === 'blocked' || node.inherited_blocked;

        return (
          <line
            key={`l2-l3-${node.id}`}
            x1={parentPos.x + 1000}
            y1={parentPos.y + 1000}
            x2={nodePos.x + 1000}
            y2={nodePos.y + 1000}
            stroke={isBlocked ? 'url(#blockedGradient)' : 'url(#activeGradient)'}
            strokeWidth={1.5}
            strokeDasharray={isBlocked ? '6 3' : undefined}
            filter={!isBlocked ? 'url(#glow)' : undefined}
            className="transition-all duration-300"
          />
        );
      })}
    </svg>
  );
}
