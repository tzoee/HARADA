'use client';

import { KeyboardEvent } from 'react';
import type { NodeWithProgress } from '@/types/computed';
import { NodePillarCard } from './node-pillar-card';

interface LevelRingProps {
  level: number;
  nodes: NodeWithProgress[];
  focusedNodeId: string | null;
  selectedNodeId: string | null;
  focusedPath: string[];
  onNodeClick: (nodeId: string) => void;
  ringIndex: number;
  totalRings: number;
}

export function LevelRing({
  level,
  nodes,
  focusedNodeId,
  selectedNodeId,
  focusedPath,
  onNodeClick,
  ringIndex,
  totalRings,
}: LevelRingProps) {
  // Calculate ring size - larger at top (Level 1), smaller at bottom (Level 7)
  const baseRadius = 200;
  const radiusDecrement = 20;
  const radius = baseRadius - (ringIndex * radiusDecrement);
  
  // Vertical spacing between rings
  const verticalSpacing = 120;
  const yOffset = ringIndex * verticalSpacing;

  // Scale factor - rings get smaller as we go deeper
  const scale = 1 - (ringIndex * 0.08);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2"
      style={{
        top: yOffset,
        transform: `translateX(-50%) scale(${scale})`,
      }}
      role="group"
      aria-label={`Level ${level} nodes`}
    >
      {/* Level label */}
      <div 
        className="absolute -left-16 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium"
        aria-hidden="true"
      >
        L{level}
      </div>

      {/* Nodes arranged in octagonal pattern */}
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        {nodes.map((node, index) => {
          // Calculate position on the ring (octagonal arrangement)
          const totalNodes = Math.min(nodes.length, 8);
          const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
          const x = radius + radius * 0.8 * Math.cos(angle);
          const y = radius + radius * 0.8 * Math.sin(angle);

          const isOnFocusedPath = focusedPath.includes(node.id);
          const isSelected = selectedNodeId === node.id;
          const isFocused = focusedNodeId === node.id;

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: x,
                top: y,
              }}
              data-node-id={node.id}
            >
              <NodePillarCard
                node={node}
                isSelected={isSelected}
                isFocused={isFocused}
                isOnFocusedPath={isOnFocusedPath}
                onClick={() => onNodeClick(node.id)}
                tabIndex={isSelected ? 0 : -1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
