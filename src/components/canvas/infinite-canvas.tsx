'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { NodeWithProgress } from '@/types/computed';
import { CanvasNode } from './canvas-node';
import { CanvasConnectors } from './canvas-connectors';
import { CanvasControls } from './canvas-controls';
import { NodeDetailPanel } from '@/components/node-detail-panel';
import { useUIStore } from '@/store/ui-store';

interface InfiniteCanvasProps {
  rootNode: NodeWithProgress;
  allNodes: NodeWithProgress[];
  onNodeUpdate?: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.2;
const ZOOM_SENSITIVITY = 0.001;

export function InfiniteCanvas({ rootNode, allNodes, onNodeUpdate }: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [focusedSubGoalId, setFocusedSubGoalId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { openDetailPanel } = useUIStore();

  // Get children of a node
  const getChildren = useCallback((parentId: string | null) => {
    return allNodes
      .filter(n => n.parent_id === parentId)
      .sort((a, b) => a.index_in_parent - b.index_in_parent);
  }, [allNodes]);

  // Level 2 nodes (8 sub-goals)
  const level2Nodes = useMemo(() => getChildren(rootNode.id), [getChildren, rootNode.id]);

  // Level 3 nodes for focused sub-goal only (performance optimization)
  const level3Nodes = useMemo(() => {
    if (!focusedSubGoalId) return [];
    return getChildren(focusedSubGoalId);
  }, [getChildren, focusedSubGoalId]);

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Main goal at center
    positions.set(rootNode.id, { x: 0, y: 0 });
    
    // Level 2 nodes in a circle around main goal
    const l2Radius = 300;
    level2Nodes.forEach((node, index) => {
      const angle = ((index / level2Nodes.length) * 360 - 90) * (Math.PI / 180);
      positions.set(node.id, {
        x: Math.cos(angle) * l2Radius,
        y: Math.sin(angle) * l2Radius,
      });
    });

    // Level 3 nodes around their parent (only when focused)
    if (focusedSubGoalId) {
      const parentPos = positions.get(focusedSubGoalId);
      if (parentPos) {
        const l3Radius = 150;
        level3Nodes.forEach((node, index) => {
          const angle = ((index / level3Nodes.length) * 360 - 90) * (Math.PI / 180);
          positions.set(node.id, {
            x: parentPos.x + Math.cos(angle) * l3Radius,
            y: parentPos.y + Math.sin(angle) * l3Radius,
          });
        });
      }
    }

    return positions;
  }, [rootNode.id, level2Nodes, level3Nodes, focusedSubGoalId]);

  // Selected node data
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return allNodes.find(n => n.id === selectedNodeId) || null;
  }, [allNodes, selectedNodeId]);

  const selectedNodeChildren = useMemo(() => {
    if (!selectedNodeId) return [];
    return getChildren(selectedNodeId);
  }, [getChildren, selectedNodeId]);

  // Center canvas on mount
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.scale * (1 + delta)));
    const scaleFactor = newScale / transform.scale;

    setTransform(prev => ({
      scale: newScale,
      x: mouseX - (mouseX - prev.x) * scaleFactor,
      y: mouseY - (mouseY - prev.y) * scaleFactor,
    }));
  }, [transform.scale]);

  // Node click handler
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    openDetailPanel(nodeId);
  }, [openDetailPanel]);

  // Double-click to zoom and focus
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    const pos = nodePositions.get(nodeId);
    if (!pos || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const targetScale = node.level === 2 ? 1.5 : 1.2;

    // If clicking a Level 2 node, enter drill mode
    if (node.level === 2) {
      setFocusedSubGoalId(focusedSubGoalId === nodeId ? null : nodeId);
    }

    // Smooth zoom to node
    setTransform({
      scale: targetScale,
      x: rect.width / 2 - pos.x * targetScale,
      y: rect.height / 2 - pos.y * targetScale,
    });

    setSelectedNodeId(nodeId);
    openDetailPanel(nodeId);
  }, [allNodes, nodePositions, focusedSubGoalId, openDetailPanel]);

  // Control handlers
  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(MAX_ZOOM, prev.scale * 1.2),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(MIN_ZOOM, prev.scale / 1.2),
    }));
  }, []);

  const handleReset = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    setFocusedSubGoalId(null);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute transition-transform duration-100"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Connectors */}
          <CanvasConnectors
            rootNode={rootNode}
            level2Nodes={level2Nodes}
            level3Nodes={level3Nodes}
            nodePositions={nodePositions}
            focusedSubGoalId={focusedSubGoalId}
          />

          {/* Main Goal (Level 1) */}
          <CanvasNode
            node={rootNode}
            position={nodePositions.get(rootNode.id) || { x: 0, y: 0 }}
            isSelected={selectedNodeId === rootNode.id}
            isFaded={false}
            onClick={() => handleNodeClick(rootNode.id)}
            onDoubleClick={() => handleNodeDoubleClick(rootNode.id)}
          />

          {/* Sub Goals (Level 2) */}
          {level2Nodes.map(node => (
            <CanvasNode
              key={node.id}
              node={node}
              position={nodePositions.get(node.id) || { x: 0, y: 0 }}
              isSelected={selectedNodeId === node.id}
              isFaded={focusedSubGoalId !== null && focusedSubGoalId !== node.id}
              onClick={() => handleNodeClick(node.id)}
              onDoubleClick={() => handleNodeDoubleClick(node.id)}
            />
          ))}

          {/* Activities (Level 3) - Only render when focused */}
          {level3Nodes.map(node => (
            <CanvasNode
              key={node.id}
              node={node}
              position={nodePositions.get(node.id) || { x: 0, y: 0 }}
              isSelected={selectedNodeId === node.id}
              isFaded={false}
              onClick={() => handleNodeClick(node.id)}
              onDoubleClick={() => handleNodeDoubleClick(node.id)}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <CanvasControls
        zoom={transform.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />

      {/* Detail Panel */}
      <NodeDetailPanel
        node={selectedNode}
        childNodes={selectedNodeChildren}
        onNodeUpdate={onNodeUpdate}
        onNavigateToChild={(childId) => {
          const child = allNodes.find(n => n.id === childId);
          if (child?.level === 3 && child.parent_id) {
            setFocusedSubGoalId(child.parent_id);
          }
          handleNodeDoubleClick(childId);
        }}
      />
    </div>
  );
}
