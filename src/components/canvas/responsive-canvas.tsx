'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Node, ChecklistItem } from '@/types/database';
import type { NodeWithProgress } from '@/types/computed';
import { InfiniteCanvas } from './infinite-canvas';
import { ChecklistMode } from './checklist-mode';
import { ViewModeTabs, ViewMode } from './view-mode-tabs';
import { computeProgress } from '@/lib/progress';
import { isInheritedBlocked } from '@/lib/blocking';
import { useRouter } from 'next/navigation';

interface ResponsiveCanvasProps {
  treeId: string;
  canvasId: string;
  nodes: Node[];
  rootNode: Node | null;
  checklistItemsByNode?: Map<string, ChecklistItem[]>;
}

export function ResponsiveCanvas({ 
  treeId, 
  canvasId, 
  nodes, 
  rootNode,
  checklistItemsByNode = new Map(),
}: ResponsiveCanvasProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

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
    const progressFromChecklistMap = new Map<string, boolean>();
    const checklistCountMap = new Map<string, number>();

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

        // Get checklist items for Level 3 nodes
        const checklistItems = node.level === 3 
          ? checklistItemsByNode.get(node.id) 
          : undefined;

        // Track if progress comes from checklist
        if (node.level === 3 && checklistItems && checklistItems.length > 0) {
          progressFromChecklistMap.set(node.id, true);
          checklistCountMap.set(node.id, checklistItems.length);
        }

        const progress = computeProgress(node, childrenWithProgress, inherited_blocked, checklistItems);
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
      progress_from_checklist: progressFromChecklistMap.get(node.id) || false,
      checklist_count: checklistCountMap.get(node.id) || 0,
    }));

    // Get root node with progress
    const rootNodeWithProgress = nodesWithProgress.find(n => n.id === rootNode.id) || null;

    return { nodesWithProgress, rootNodeWithProgress };
  }, [nodes, rootNode, checklistItemsByNode]);

  const handleNodeUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  // Handle switching to map mode and focusing on a specific node
  const handleShowOnMap = useCallback((nodeId: string) => {
    setFocusNodeId(nodeId);
    setViewMode('map');
  }, []);

  // Handle switching to checklist mode for a specific node
  const handleOpenChecklist = useCallback((nodeId: string) => {
    setViewMode('checklist');
  }, []);

  if (!rootNodeWithProgress) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No nodes found
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* View Mode Tabs */}
      <div className="flex items-center justify-center py-2 border-b border-slate-800/50 bg-slate-950/50">
        <ViewModeTabs activeMode={viewMode} onModeChange={setViewMode} />
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <InfiniteCanvas
            rootNode={rootNodeWithProgress}
            allNodes={nodesWithProgress}
            onNodeUpdate={handleNodeUpdate}
            focusNodeId={focusNodeId}
            onFocusHandled={() => setFocusNodeId(null)}
            onOpenChecklist={handleOpenChecklist}
          />
        ) : (
          <ChecklistMode
            allNodes={nodesWithProgress}
            checklistItemsByNode={checklistItemsByNode}
            onShowOnMap={handleShowOnMap}
            onNodeUpdate={handleNodeUpdate}
          />
        )}
      </div>
    </div>
  );
}
