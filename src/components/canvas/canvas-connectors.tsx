'use client';

import type { NodeWithProgress } from '@/types/computed';

interface CanvasConnectorsProps {
  rootNode: NodeWithProgress;
  level2Nodes: NodeWithProgress[];
  level3Nodes: NodeWithProgress[];
  nodePositions: Map<string, { x: number; y: number }>;
  focusedSubGoalId: string | null;
  hoveredNodeId?: string | null;
}

export function CanvasConnectors({
  rootNode,
  level2Nodes,
  level3Nodes,
  nodePositions,
  focusedSubGoalId,
  hoveredNodeId,
}: CanvasConnectorsProps) {
  const rootPos = nodePositions.get(rootNode.id) || { x: 0, y: 0 };

  // Status colors for connectors
  const getConnectorColor = (node: NodeWithProgress) => {
    if (node.status === 'blocked' || node.inherited_blocked) return '#64748b';
    if (node.status === 'done') return '#22c55e';
    return '#3b82f6';
  };

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
        {/* Glow filters for each status */}
        <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#3b82f6" floodOpacity="0.6" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#22c55e" floodOpacity="0.6" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#ef4444" floodOpacity="0.6" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
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
        const isHighlighted = hoveredNodeId === node.id || hoveredNodeId === rootNode.id;
        const color = getConnectorColor(node);

        // Determine glow filter - no glow for blocked connectors
        const glowFilter = isHighlighted && !isBlocked
          ? (node.status === 'done' ? 'url(#glowGreen)' : 'url(#glowBlue)')
          : undefined;

        return (
          <line
            key={`l1-l2-${node.id}`}
            x1={rootPos.x + 1000}
            y1={rootPos.y + 1000}
            x2={nodePos.x + 1000}
            y2={nodePos.y + 1000}
            stroke={color}
            strokeWidth={isHighlighted ? 3 : 2.5}
            strokeDasharray={isBlocked ? '8 4' : undefined}
            opacity={isFaded ? 0.15 : (isHighlighted ? 0.9 : 0.5)}
            filter={glowFilter}
            style={{
              transition: 'opacity 200ms ease-out, stroke-width 200ms ease-out',
            }}
          />
        );
      })}

      {/* Level 2 to Level 3 connectors (only when focused) */}
      {focusedSubGoalId && level3Nodes.map(node => {
        const parentPos = nodePositions.get(focusedSubGoalId);
        const nodePos = nodePositions.get(node.id);
        if (!parentPos || !nodePos) return null;

        const isBlocked = node.status === 'blocked' || node.inherited_blocked;
        const isHighlighted = hoveredNodeId === node.id || hoveredNodeId === focusedSubGoalId;
        const color = getConnectorColor(node);

        // No glow for blocked connectors
        const glowFilter = isHighlighted && !isBlocked
          ? (node.status === 'done' ? 'url(#glowGreen)' : 'url(#glowBlue)')
          : undefined;

        return (
          <line
            key={`l2-l3-${node.id}`}
            x1={parentPos.x + 1000}
            y1={parentPos.y + 1000}
            x2={nodePos.x + 1000}
            y2={nodePos.y + 1000}
            stroke={color}
            strokeWidth={isHighlighted ? 2 : 1.5}
            strokeDasharray={isBlocked ? '6 3' : undefined}
            opacity={isHighlighted ? 0.85 : 0.4}
            filter={glowFilter}
            style={{
              transition: 'opacity 200ms ease-out, stroke-width 200ms ease-out',
            }}
          />
        );
      })}
    </svg>
  );
}
