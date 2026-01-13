'use client';

import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { MandalaNode } from './mandala-node';

interface MandalaRingProps {
  nodes: NodeWithProgress[];
  radius: number;
  onNodeClick: (nodeId: string) => void;
  onNodeExpand?: (nodeId: string) => void;
  selectedNodeId: string | null;
  expandedNodeId?: string | null;
  isOuter?: boolean;
}

export function MandalaRing({
  nodes,
  radius,
  onNodeClick,
  onNodeExpand,
  selectedNodeId,
  expandedNodeId,
  isOuter = false,
}: MandalaRingProps) {
  // Calculate position for each node in a circle
  const getNodePosition = (index: number, total: number) => {
    // Start from top (-90 degrees) and go clockwise
    const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <>
      {nodes.map((node, index) => {
        const { x, y } = getNodePosition(index, nodes.length);
        
        return (
          <MandalaNode
            key={node.id}
            node={node}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => onNodeClick(node.id)}
            onExpand={onNodeExpand ? () => onNodeExpand(node.id) : undefined}
            isSelected={selectedNodeId === node.id}
            isExpanded={expandedNodeId === node.id}
            isOuter={isOuter}
          />
        );
      })}

      {/* Connection lines from center to nodes */}
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: '100%', height: '100%' }}
      >
        {nodes.map((node, index) => {
          const { x, y } = getNodePosition(index, nodes.length);
          const centerX = 400; // Half of container width
          const centerY = 400; // Half of container height
          
          return (
            <line
              key={`line-${node.id}`}
              x1={centerX}
              y1={centerY}
              x2={centerX + x}
              y2={centerY + y}
              stroke={node.inherited_blocked ? '#64748b' : '#3b82f6'}
              strokeWidth={isOuter ? 1 : 2}
              strokeOpacity={isOuter ? 0.3 : 0.5}
              strokeDasharray={node.inherited_blocked ? '4 4' : undefined}
            />
          );
        })}
      </svg>
    </>
  );
}
