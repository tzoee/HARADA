'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { NodeWithProgress } from '@/types/computed';
import { MandalaCenter } from './mandala-center';
import { MandalaRing } from './mandala-ring';
import { NodeDetailPanel } from '@/components/node-detail-panel';
import { useUIStore } from '@/store/ui-store';

interface MandalaViewProps {
  rootNode: NodeWithProgress;
  allNodes: NodeWithProgress[];
  onNodeUpdate?: () => void;
}

export function MandalaView({ rootNode, allNodes, onNodeUpdate }: MandalaViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const { openDetailPanel } = useUIStore();

  // Get children of a node
  const getChildren = (parentId: string | null) => {
    return allNodes
      .filter(n => n.parent_id === parentId)
      .sort((a, b) => a.index_in_parent - b.index_in_parent);
  };

  // Level 2 nodes (8 sub-goals around main goal)
  const level2Nodes = useMemo(() => getChildren(rootNode.id), [allNodes, rootNode.id]);

  // Level 3 nodes for expanded node
  const level3Nodes = useMemo(() => {
    if (!expandedNodeId) return [];
    return getChildren(expandedNodeId);
  }, [allNodes, expandedNodeId]);

  // Selected node data
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return allNodes.find(n => n.id === selectedNodeId) || null;
  }, [allNodes, selectedNodeId]);

  // Children of selected node
  const selectedNodeChildren = useMemo(() => {
    if (!selectedNodeId) return [];
    return getChildren(selectedNodeId);
  }, [allNodes, selectedNodeId]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    openDetailPanel();
  };

  const handleNodeExpand = (nodeId: string) => {
    setExpandedNodeId(expandedNodeId === nodeId ? null : nodeId);
  };

  return (
    <div className="relative w-full h-full min-h-[600px] flex items-center justify-center overflow-auto p-8">
      {/* Main Mandala Container */}
      <div className="relative" style={{ width: '800px', height: '800px' }}>
        {/* Center - Main Goal */}
        <MandalaCenter
          node={rootNode}
          onClick={() => handleNodeClick(rootNode.id)}
          isSelected={selectedNodeId === rootNode.id}
        />

        {/* Level 2 Ring - 8 Sub-goals */}
        <MandalaRing
          nodes={level2Nodes}
          radius={280}
          onNodeClick={handleNodeClick}
          onNodeExpand={handleNodeExpand}
          selectedNodeId={selectedNodeId}
          expandedNodeId={expandedNodeId}
        />

        {/* Level 3 Ring - Tasks (shown when Level 2 is expanded) */}
        {expandedNodeId && level3Nodes.length > 0 && (
          <MandalaRing
            nodes={level3Nodes}
            radius={450}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
            isOuter
          />
        )}
      </div>

      {/* Node Detail Panel */}
      <NodeDetailPanel
        node={selectedNode}
        childNodes={selectedNodeChildren}
        onNodeUpdate={onNodeUpdate}
        onNavigateToChild={(childId) => {
          setSelectedNodeId(childId);
          setExpandedNodeId(childId);
        }}
      />
    </div>
  );
}
