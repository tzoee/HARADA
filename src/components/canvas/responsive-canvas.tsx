'use client';

import { useMemo } from 'react';
import type { Node } from '@/types/database';
import type { NodeWithProgress } from '@/types/computed';
import { InfiniteCanvas } from './infinite-canvas';
import { computeProgress } from '@/lib/progress';
import { isInheritedBlocked } from '@/lib/blocking';
import { useRouter } from 'next/navigation';

interface ResponsiveCanvasProps {
  treeId: string;
  canvasId: string;
  nodes: Node[];
  rootNode: Node | null;
}

export function ResponsiveCanvas({ treeId, canvasId, nodes, rootNode }: ResponsiveCanvasProps) {
  const router = useRouter();

  // Build node hierarchy and compute progress
  const { nodesWithProgress, rootNodeWithProgress } = useMemo(() => {
    if (!rootNode) {
      return { nodesWithProgress: [], rootNodeWithProgress: null };
    }

    const nodeMap = new Map<string, Node>();
    const childrenMap = new Map<string, Node[]>();
    const nodesByLevel = new Map<number, Node[]>();

    // Build lookup maps
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      
      if (!nodesByLevel.has(node.level)) {
        nodesByLevel.set(node.level, []);
      }
      nodesByLevel.get(node.level)!.push(node);

      const parentId = node.parent_id || 'root';
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node);
    });

    // Get ancestors for a node
    function getAncestors(node: Node): Node[] {
      const ancestors: Node[] = [];
      let current = node.parent_id ? nodeMap.get(node.parent_id) : null;
      while (current) {
        ancestors.unshift(current);
        current = current.parent_id ? nodeMap.get(current.parent_id) : null;
      }
      return ancestors;
    }

    // Compute progress for all nodes (bottom-up)
    const progressMap = new Map<string, number>();
    const inheritedBlockedMap = new Map<string, boolean>();

    // Process from max level down to 1
    const maxLevel = Math.max(...Array.from(nodesByLevel.keys()), 1);
    for (let level = maxLevel; level >= 1; level--) {
      const levelNodes = nodesByLevel.get(level) || [];
      
      for (const node of levelNodes) {
        const ancestors = getAncestors(node);
        const inherited_blocked = isInheritedBlocked(node, ancestors);
        inheritedBlockedMap.set(node.id, inherited_blocked);

        const children = childrenMap.get(node.id) || [];
        const childrenWithProgress = children.map(c => ({
          progress: progressMap.get(c.id) || 0,
        }));

        const progress = computeProgress(node, childrenWithProgress, inherited_blocked);
        progressMap.set(node.id, progress);
      }
    }

    // Convert to NodeWithProgress array
    const nodesWithProgress: NodeWithProgress[] = nodes.map(node => ({
      ...node,
      progress: progressMap.get(node.id) || 0,
      inherited_blocked: inheritedBlockedMap.get(node.id) || false,
      children_count: (childrenMap.get(node.id) || []).length,
      children_generated: (childrenMap.get(node.id) || []).length > 0,
    }));

    // Get root node with progress
    const rootNodeWithProgress = nodesWithProgress.find(n => n.id === rootNode.id) || null;

    return { nodesWithProgress, rootNodeWithProgress };
  }, [nodes, rootNode]);

  const handleNodeUpdate = () => {
    router.refresh();
  };

  if (!rootNodeWithProgress) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No nodes found
      </div>
    );
  }

  return (
    <InfiniteCanvas
      rootNode={rootNodeWithProgress}
      allNodes={nodesWithProgress}
      onNodeUpdate={handleNodeUpdate}
    />
  );
}
