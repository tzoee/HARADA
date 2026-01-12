// Computed types with additional fields calculated at runtime

import type { Node, PlanTree, Canvas } from './database';

/**
 * Node with computed progress and inherited_blocked status
 */
export interface NodeWithProgress extends Node {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Whether this node is blocked due to a Level 2 ancestor being blocked */
  inherited_blocked: boolean;
  /** Number of children this node has (0 for leaf nodes or unexpanded nodes) */
  children_count: number;
  /** Whether children have been generated for this node */
  children_generated: boolean;
}

/**
 * Plan tree with computed overall progress
 */
export interface PlanTreeWithProgress extends PlanTree {
  /** Overall progress of the tree (0 to 1) */
  progress: number;
  /** Root node with progress data */
  root_node: NodeWithProgress | null;
}

/**
 * Canvas with its plan trees
 */
export interface CanvasWithTrees extends Canvas {
  /** Plan trees belonging to this canvas */
  trees: PlanTreeWithProgress[];
}

/**
 * Data structure for focused path in Tower View
 */
export interface FocusedPathData {
  /** Nodes from Level 1 to the focused node */
  path: NodeWithProgress[];
  /** Map of level number to sibling nodes at that level */
  siblings_by_level: Map<number, NodeWithProgress[]>;
}

/**
 * Connection between parent and child nodes for connector overlay
 */
export interface NodeConnection {
  parent_id: string;
  child_id: string;
  parent_position: { x: number; y: number };
  child_position: { x: number; y: number };
  is_blocked: boolean;
}

/**
 * Search result item
 */
export interface SearchResult {
  node: Node;
  canvas_name: string;
  canvas_id: string;
  tree_title: string;
  tree_id: string;
  /** Path from root to this node (node titles) */
  path: string[];
}

/**
 * Reminder item for reminder panel
 */
export interface ReminderItem {
  node: Node;
  tree_title: string;
  tree_id: string;
  canvas_name: string;
  canvas_id: string;
  /** Days until due date (negative if overdue) */
  days_until_due: number;
}

/**
 * Export data structure for canvas export
 */
export interface CanvasExportData {
  version: string;
  exported_at: string;
  canvas: Omit<Canvas, 'user_id'>;
  trees: Array<{
    tree: Omit<PlanTree, 'user_id' | 'canvas_id'>;
    nodes: Array<Omit<Node, 'user_id' | 'tree_id'>>;
  }>;
}
