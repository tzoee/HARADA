import type { Node, NodeStatus, ChecklistItem, ChecklistStatus } from '@/types/database';
import type { NodeWithProgress } from '@/types/computed';

/**
 * Progress values for each status at leaf nodes (Level 7)
 */
const STATUS_PROGRESS: Record<NodeStatus, number> = {
  done: 1,
  in_progress: 0.5,
  blocked: 0,
};

/**
 * Progress values for checklist item statuses
 */
const CHECKLIST_STATUS_PROGRESS: Record<ChecklistStatus, number> = {
  done: 1,
  in_progress: 0.5,
  todo: 0,
  blocked: 0,
};

/**
 * Computes progress for a leaf node based on its status.
 * 
 * Property 1: Leaf Node Progress Values
 * - done = 1
 * - in_progress = 0.5
 * - blocked = 0
 */
export function computeLeafProgress(status: NodeStatus): number {
  return STATUS_PROGRESS[status];
}

/**
 * Computes progress from checklist items.
 * Returns null if no checklist items exist (fallback to node status).
 * 
 * Checklist item weights:
 * - done = 1
 * - in_progress = 0.5
 * - todo = 0
 * - blocked = 0
 */
export function computeChecklistProgress(items: ChecklistItem[]): number | null {
  if (items.length === 0) {
    return null; // No checklist items, fallback to node status
  }

  const totalProgress = items.reduce((sum, item) => {
    return sum + CHECKLIST_STATUS_PROGRESS[item.status];
  }, 0);

  return totalProgress / items.length;
}

/**
 * Computes progress for a node based on its status and children.
 * 
 * Property 1: Leaf nodes (Level 7): done=1, in_progress=0.5, blocked=0
 * Property 2: Non-leaf nodes: average of children's progress
 * Property 3: Inherited blocked nodes: always 0
 * Property 4: Level 3 nodes with checklist items: progress from checklist
 * 
 * @param node - The node to compute progress for
 * @param children - Array of child nodes with their progress already computed
 * @param isInheritedBlocked - Whether this node is under an inherited blocked path
 * @param checklistItems - Optional checklist items for Level 3 nodes
 * @returns Progress value from 0 to 1
 */
export function computeProgress(
  node: Pick<Node, 'level' | 'status'>,
  children: Pick<NodeWithProgress, 'progress'>[],
  isInheritedBlocked: boolean,
  checklistItems?: ChecklistItem[]
): number {
  // Property 3: Inherited blocked nodes always have 0 progress
  if (isInheritedBlocked) {
    return 0;
  }

  // Property 4: Level 3 nodes with checklist items
  if (node.level === 3 && checklistItems) {
    const checklistProgress = computeChecklistProgress(checklistItems);
    if (checklistProgress !== null) {
      return checklistProgress;
    }
    // Fallback to node status if no checklist items
  }

  // Property 1: Leaf node (Level 7) or node with no children
  if (node.level === 7 || children.length === 0) {
    return computeLeafProgress(node.status);
  }

  // Property 2: Non-leaf node - average of children's progress
  const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
  return totalProgress / children.length;
}

/**
 * Computes progress for an entire tree of nodes.
 * Processes nodes from leaves to root to ensure children are computed first.
 * 
 * @param nodes - All nodes in the tree
 * @param isInheritedBlockedFn - Function to determine if a node is inherited blocked
 * @param checklistItemsByNode - Map of node ID to checklist items (for Level 3 nodes)
 * @returns Map of node ID to computed progress
 */
export function computeTreeProgress(
  nodes: Node[],
  isInheritedBlockedFn: (node: Node, ancestors: Node[]) => boolean,
  checklistItemsByNode?: Map<string, ChecklistItem[]>
): Map<string, number> {
  const progressMap = new Map<string, number>();
  const nodeMap = new Map<string, Node>();
  const childrenMap = new Map<string, Node[]>();

  // Build lookup maps
  for (const node of nodes) {
    nodeMap.set(node.id, node);
    
    const parentId = node.parent_id || 'root';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  }

  // Build ancestor path for each node
  const getAncestors = (node: Node): Node[] => {
    const ancestors: Node[] = [];
    let current = node.parent_id ? nodeMap.get(node.parent_id) : null;
    while (current) {
      ancestors.unshift(current);
      current = current.parent_id ? nodeMap.get(current.parent_id) : null;
    }
    return ancestors;
  };

  // Process nodes from deepest level to root (Level 7 to Level 1)
  const nodesByLevel = new Map<number, Node[]>();
  for (const node of nodes) {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level)!.push(node);
  }

  // Process from Level 7 down to Level 1
  for (let level = 7; level >= 1; level--) {
    const levelNodes = nodesByLevel.get(level) || [];
    
    for (const node of levelNodes) {
      const ancestors = getAncestors(node);
      const isInheritedBlocked = isInheritedBlockedFn(node, ancestors);
      
      const children = childrenMap.get(node.id) || [];
      const childrenWithProgress = children.map(child => ({
        progress: progressMap.get(child.id) || 0,
      }));

      // Get checklist items for Level 3 nodes
      const checklistItems = node.level === 3 
        ? checklistItemsByNode?.get(node.id) 
        : undefined;

      const progress = computeProgress(node, childrenWithProgress, isInheritedBlocked, checklistItems);
      progressMap.set(node.id, progress);
    }
  }

  return progressMap;
}
