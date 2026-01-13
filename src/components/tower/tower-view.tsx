'use client';

import { useState, useMemo, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import type { Node } from '@/types/database';
import { TowerContainer } from './tower-container';
import { LevelRing } from './level-ring';
import { ConnectorOverlay } from './connector-overlay';
import { NodeDetailPanel } from '@/components/node-detail-panel';
import { useUIStore } from '@/store/ui-store';
import { computeProgress } from '@/lib/progress';
import { isInheritedBlocked } from '@/lib/blocking';
import type { NodeWithProgress } from '@/types/computed';
import { useRouter } from 'next/navigation';

interface TowerViewProps {
  treeId: string;
  canvasId: string;
  nodes: Node[];
  rootNode: Node | null;
}

export function TowerView({ treeId, canvasId, nodes, rootNode }: TowerViewProps) {
  const router = useRouter();
  const { focusedNodeId, setFocusedNode, openDetailPanel, selectedNodeId, closeDetailPanel, detailPanelOpen } = useUIStore();
  const [localNodes, setLocalNodes] = useState(nodes);
  const towerRef = useRef<HTMLDivElement>(null);

  // Build node hierarchy and compute progress
  const { nodesByLevel, nodesWithProgress, focusedPath, childrenMap } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const childrenMap = new Map<string, Node[]>();
    const nodesByLevel = new Map<number, Node[]>();

    // Build lookup maps
    localNodes.forEach(node => {
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

    for (let level = 3; level >= 1; level--) {
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

    // Convert to NodeWithProgress
    const nodesWithProgress = new Map<string, NodeWithProgress>();
    nodes.forEach(node => {
      nodesWithProgress.set(node.id, {
        ...node,
        progress: progressMap.get(node.id) || 0,
        inherited_blocked: inheritedBlockedMap.get(node.id) || false,
        children_count: (childrenMap.get(node.id) || []).length,
        children_generated: (childrenMap.get(node.id) || []).length > 0,
      });
    });

    // Build focused path
    const focusedPath: string[] = [];
    if (focusedNodeId) {
      let current = nodeMap.get(focusedNodeId);
      while (current) {
        focusedPath.unshift(current.id);
        current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
      }
    } else if (rootNode) {
      focusedPath.push(rootNode.id);
    }

    return { nodesByLevel, nodesWithProgress, focusedPath, childrenMap };
  }, [localNodes, rootNode, focusedNodeId]);

  // Get visible levels based on focus
  const visibleLevels = useMemo(() => {
    const levels: number[] = [];
    for (let i = 1; i <= 3; i++) {
      if (nodesByLevel.has(i) && (nodesByLevel.get(i)?.length || 0) > 0) {
        levels.push(i);
      }
    }
    return levels;
  }, [nodesByLevel]);

  function handleNodeClick(nodeId: string) {
    setFocusedNode(nodeId);
    openDetailPanel(nodeId);
  }

  // Get selected node and its children for the detail panel
  const selectedNode = selectedNodeId ? nodesWithProgress.get(selectedNodeId) : null;
  const selectedNodeChildren = selectedNodeId 
    ? (childrenMap.get(selectedNodeId) || []).map(n => nodesWithProgress.get(n.id)!).filter(Boolean)
    : [];

  const handleNodeUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleNavigateToChild = useCallback((childId: string) => {
    setFocusedNode(childId);
    openDetailPanel(childId);
  }, [setFocusedNode, openDetailPanel]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (!selectedNodeId) return;

    const currentNode = nodesWithProgress.get(selectedNodeId);
    if (!currentNode) return;

    switch (e.key) {
      case 'Escape':
        // Close detail panel
        closeDetailPanel();
        e.preventDefault();
        break;

      case 'ArrowUp':
        // Navigate to parent
        if (currentNode.parent_id) {
          const parentNode = nodesWithProgress.get(currentNode.parent_id);
          if (parentNode) {
            handleNodeClick(parentNode.id);
            e.preventDefault();
          }
        }
        break;

      case 'ArrowDown':
        // Navigate to first child
        const children = childrenMap.get(currentNode.id) || [];
        if (children.length > 0) {
          handleNodeClick(children[0].id);
          e.preventDefault();
        }
        break;

      case 'ArrowLeft':
        // Navigate to previous sibling
        if (currentNode.parent_id) {
          const siblings = childrenMap.get(currentNode.parent_id) || [];
          const currentIndex = siblings.findIndex(s => s.id === currentNode.id);
          if (currentIndex > 0) {
            handleNodeClick(siblings[currentIndex - 1].id);
            e.preventDefault();
          }
        }
        break;

      case 'ArrowRight':
        // Navigate to next sibling
        if (currentNode.parent_id) {
          const siblings = childrenMap.get(currentNode.parent_id) || [];
          const currentIndex = siblings.findIndex(s => s.id === currentNode.id);
          if (currentIndex < siblings.length - 1) {
            handleNodeClick(siblings[currentIndex + 1].id);
            e.preventDefault();
          }
        }
        break;

      case 'Enter':
      case ' ':
        // Open detail panel for current node
        openDetailPanel(currentNode.id);
        e.preventDefault();
        break;

      case 'Home':
        // Navigate to root
        if (rootNode) {
          handleNodeClick(rootNode.id);
          e.preventDefault();
        }
        break;
    }
  }, [selectedNodeId, nodesWithProgress, childrenMap, closeDetailPanel, openDetailPanel, rootNode]);

  // Focus management for accessibility
  useEffect(() => {
    if (selectedNodeId && towerRef.current) {
      const selectedButton = towerRef.current.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLButtonElement;
      if (selectedButton) {
        selectedButton.focus();
      }
    }
  }, [selectedNodeId]);

  if (!rootNode) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No nodes found
      </div>
    );
  }

  return (
    <>
      <TowerContainer>
        {/* Connector Overlay */}
        <ConnectorOverlay
          nodes={localNodes}
          nodesWithProgress={nodesWithProgress}
          focusedPath={focusedPath}
        />

        {/* Level Rings */}
        <div 
          ref={towerRef}
          className="tower-3d relative"
          role="tree"
          aria-label="Plan tree tower view"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Screen reader instructions */}
          <div className="sr-only" aria-live="polite">
            Use arrow keys to navigate: Up for parent, Down for first child, Left/Right for siblings. 
            Press Enter or Space to open details. Press Escape to close the detail panel.
          </div>
          {visibleLevels.map((level, index) => {
            const levelNodes = nodesByLevel.get(level) || [];
            const levelNodesWithProgress = levelNodes.map(
              n => nodesWithProgress.get(n.id)!
            ).filter(Boolean);

            // Get the focused node at this level
            const focusedNodeAtLevel = focusedPath.find(id => {
              const node = nodesWithProgress.get(id);
              return node?.level === level;
            });

            // Filter to show only siblings of focused path
            let visibleNodes = levelNodesWithProgress;
            if (focusedNodeAtLevel) {
              const focusedNode = nodesWithProgress.get(focusedNodeAtLevel);
              if (focusedNode) {
                visibleNodes = levelNodesWithProgress.filter(
                  n => n.parent_id === focusedNode.parent_id
                );
              }
            }

            return (
              <LevelRing
                key={level}
                level={level}
                nodes={visibleNodes}
                focusedNodeId={focusedNodeId}
                selectedNodeId={selectedNodeId}
                focusedPath={focusedPath}
                onNodeClick={handleNodeClick}
                ringIndex={index}
                totalRings={visibleLevels.length}
              />
            );
          })}
        </div>
      </TowerContainer>

      {/* Node Detail Panel */}
      <NodeDetailPanel
        node={selectedNode || null}
        childNodes={selectedNodeChildren}
        onNodeUpdate={handleNodeUpdate}
        onNavigateToChild={handleNavigateToChild}
      />
    </>
  );
}
