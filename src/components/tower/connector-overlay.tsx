'use client';

import { useMemo } from 'react';
import type { Node } from '@/types/database';
import type { NodeWithProgress } from '@/types/computed';

interface ConnectorOverlayProps {
  nodes: Node[];
  nodesWithProgress: Map<string, NodeWithProgress>;
  focusedPath: string[];
}

interface Connection {
  parentId: string;
  childId: string;
  parentLevel: number;
  childLevel: number;
  childIndex: number;
  isBlocked: boolean;
  isOnFocusedPath: boolean;
}

export function ConnectorOverlay({
  nodes,
  nodesWithProgress,
  focusedPath,
}: ConnectorOverlayProps) {
  // Build connections between parent-child nodes
  const connections = useMemo(() => {
    const conns: Connection[] = [];
    const focusedSet = new Set(focusedPath);

    for (const node of nodes) {
      if (node.parent_id) {
        const parentNode = nodesWithProgress.get(node.parent_id);
        const childNode = nodesWithProgress.get(node.id);
        
        if (parentNode && childNode) {
          const isOnFocusedPath = focusedSet.has(node.id) && focusedSet.has(node.parent_id);
          
          conns.push({
            parentId: node.parent_id,
            childId: node.id,
            parentLevel: parentNode.level,
            childLevel: childNode.level,
            childIndex: node.index_in_parent,
            isBlocked: childNode.inherited_blocked || childNode.status === 'blocked',
            isOnFocusedPath,
          });
        }
      }
    }

    return conns;
  }, [nodes, nodesWithProgress, focusedPath]);

  // Calculate positions based on level ring layout
  // These values should match LevelRing component
  const baseRadius = 200;
  const radiusDecrement = 20;
  const verticalSpacing = 120;

  function getNodePosition(level: number, index: number, ringIndex: number) {
    const radius = baseRadius - (ringIndex * radiusDecrement);
    const totalNodes = 8;
    const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
    const x = radius + radius * 0.8 * Math.cos(angle);
    const y = ringIndex * verticalSpacing + radius + radius * 0.8 * Math.sin(angle);
    return { x, y };
  }

  // SVG viewBox dimensions
  const svgWidth = 600;
  const svgHeight = 900;
  const centerX = svgWidth / 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        {/* Gradient for normal connections */}
        <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(148, 163, 184)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(148, 163, 184)" stopOpacity="0.2" />
        </linearGradient>

        {/* Gradient for focused path connections */}
        <linearGradient id="connector-focused" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
        </linearGradient>

        {/* Pattern for blocked connections */}
        <pattern id="blocked-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M0,4 l8,-8 M-2,2 l4,-4 M6,10 l4,-4" 
                stroke="rgb(239, 68, 68)" 
                strokeWidth="1" 
                strokeOpacity="0.4" />
        </pattern>
      </defs>

      {/* Render connections */}
      {connections.map((conn) => {
        const parentRingIndex = conn.parentLevel - 1;
        const childRingIndex = conn.childLevel - 1;
        
        // Get parent position (center of parent ring for simplicity)
        const parentRadius = baseRadius - (parentRingIndex * radiusDecrement);
        const parentY = parentRingIndex * verticalSpacing + parentRadius;
        
        // Get child position
        const childPos = getNodePosition(conn.childLevel, conn.childIndex, childRingIndex);
        
        // Adjust positions relative to SVG center
        const startX = centerX;
        const startY = parentY;
        const endX = centerX - baseRadius + childPos.x;
        const endY = childPos.y;

        // Create curved path
        const midY = (startY + endY) / 2;
        const path = `M ${startX} ${startY} Q ${startX} ${midY} ${endX} ${endY}`;

        let strokeStyle: string;
        if (conn.isBlocked) {
          strokeStyle = 'url(#blocked-pattern)';
        } else if (conn.isOnFocusedPath) {
          strokeStyle = 'url(#connector-focused)';
        } else {
          strokeStyle = 'url(#connector-gradient)';
        }

        return (
          <path
            key={`${conn.parentId}-${conn.childId}`}
            d={path}
            fill="none"
            stroke={strokeStyle}
            strokeWidth={conn.isOnFocusedPath ? 2 : 1}
            strokeLinecap="round"
            className={conn.isBlocked ? 'opacity-50' : ''}
          />
        );
      })}
    </svg>
  );
}
