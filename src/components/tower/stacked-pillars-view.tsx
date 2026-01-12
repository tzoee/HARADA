'use client';

import { useMemo, useCallback } from 'react';
import type { Node } from '@/types/database';
import { useUIStore } from '@/store/ui-store';
import { computeProgress } from '@/lib/progress';
import { isInheritedBlocked } from '@/lib/blocking';
import type { NodeWithProgress } from '@/types/computed';
import { NodeDetailPanel } from '@/components/node-detail-panel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Ban, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StackedPillarsViewProps {
  treeId: string;
  canvasId: string;
  nodes: Node[];
  rootNode: Node | null;
}

export function StackedPillarsView({ treeId, canvasId, nodes, rootNode }: StackedPillarsViewProps) {
  const router = useRouter();
  const { focusedNodeId, setFocusedNode, openDetailPanel, selectedNodeId } = useUIStore();

  // Build node hierarchy and compute progress
  const { nodesByLevel, nodesWithProgress, focusedPath, childrenMap } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const childrenMap = new Map<string, Node[]>();
    const nodesByLevel = new Map<number, Node[]>();

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

    function getAncestors(node: Node): Node[] {
      const ancestors: Node[] = [];
      let current = node.parent_id ? nodeMap.get(node.parent_id) : null;
      while (current) {
        ancestors.unshift(current);
        current = current.parent_id ? nodeMap.get(current.parent_id) : null;
      }
      return ancestors;
    }

    const progressMap = new Map<string, number>();
    const inheritedBlockedMap = new Map<string, boolean>();

    for (let level = 7; level >= 1; level--) {
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
  }, [nodes, rootNode, focusedNodeId]);

  // Get visible levels
  const visibleLevels = useMemo(() => {
    const levels: number[] = [];
    for (let i = 1; i <= 7; i++) {
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

  if (!rootNode) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No nodes found
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto p-4 space-y-4">
        {visibleLevels.map((level) => {
          const levelNodes = nodesByLevel.get(level) || [];
          const levelNodesWithProgress = levelNodes.map(
            n => nodesWithProgress.get(n.id)!
          ).filter(Boolean);

          // Filter to show only siblings of focused path
          const focusedNodeAtLevel = focusedPath.find(id => {
            const node = nodesWithProgress.get(id);
            return node?.level === level;
          });

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
            <div key={level} className="space-y-2">
              {/* Level Header */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Level {level}</span>
                <span className="text-xs">({visibleNodes.length} nodes)</span>
              </div>

              {/* Nodes Grid */}
              <div className="grid grid-cols-2 gap-2">
                {visibleNodes.map((node) => (
                  <MobileNodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    isOnFocusedPath={focusedPath.includes(node.id)}
                    onClick={() => handleNodeClick(node.id)}
                  />
                ))}
              </div>

              {/* Connector to next level */}
              {level < Math.max(...visibleLevels) && (
                <div className="flex justify-center py-2">
                  <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NodeDetailPanel
        node={selectedNode || null}
        children={selectedNodeChildren}
        onNodeUpdate={handleNodeUpdate}
        onNavigateToChild={handleNavigateToChild}
      />
    </>
  );
}

interface MobileNodeCardProps {
  node: NodeWithProgress;
  isSelected: boolean;
  isOnFocusedPath: boolean;
  onClick: () => void;
}

function MobileNodeCard({ node, isSelected, isOnFocusedPath, onClick }: MobileNodeCardProps) {
  const progressPercent = Math.round(node.progress * 100);
  const status = node.inherited_blocked ? 'blocked' : node.status;

  const statusConfig = {
    done: { icon: Check, color: 'text-green-400', bg: 'bg-green-500/20' },
    in_progress: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    blocked: { icon: Ban, color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg text-left w-full",
        "bg-slate-800/80 border border-slate-700/50",
        "transition-all duration-200",
        isSelected && "ring-2 ring-primary border-primary/50",
        isOnFocusedPath && !isSelected && "border-primary/30",
        node.inherited_blocked && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-200 line-clamp-2 flex-1">
          {node.title}
        </span>
        <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] shrink-0", config.bg, config.color)}>
          <StatusIcon className={cn("w-3 h-3", status === 'in_progress' && "animate-spin")} />
        </Badge>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{progressPercent}%</span>
      </div>

      {node.inherited_blocked && (
        <span className="text-[9px] text-red-400/80 mt-1 block">Blocked by L2</span>
      )}
    </button>
  );
}
