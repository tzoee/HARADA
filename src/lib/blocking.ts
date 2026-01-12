import type { Node } from '@/types/database';

/**
 * Determines if a node is inherited blocked.
 * 
 * Property 4: Blocking Propagation Rules
 * - If a Level 2 node has status "blocked", ALL its descendants have inherited_blocked = true
 * - If a Level 1 node has status "blocked", its children do NOT have inherited_blocked = true
 * - If a node at Level 3-7 has status "blocked" and is NOT under an inherited_blocked path,
 *   its children do NOT automatically have inherited_blocked = true
 * 
 * @param node - The node to check
 * @param ancestors - Array of ancestor nodes from root to parent (ordered by level)
 * @returns true if the node is inherited blocked
 */
export function isInheritedBlocked(
  node: Pick<Node, 'level'>,
  ancestors: Pick<Node, 'level' | 'status'>[]
): boolean {
  // Find Level 2 ancestor in the path
  const level2Ancestor = ancestors.find(ancestor => ancestor.level === 2);

  // If there's a Level 2 ancestor and it's blocked, this node is inherited blocked
  if (level2Ancestor && level2Ancestor.status === 'blocked') {
    return true;
  }

  return false;
}

/**
 * Checks if a node should display the "Blocked by Level 2" label.
 * This is true when the node is inherited blocked.
 */
export function shouldShowBlockedByLevel2Label(
  node: Pick<Node, 'level'>,
  ancestors: Pick<Node, 'level' | 'status'>[]
): boolean {
  return isInheritedBlocked(node, ancestors);
}

/**
 * Gets the blocking Level 2 ancestor if one exists.
 * Useful for displaying which Level 2 node is causing the block.
 */
export function getBlockingLevel2Ancestor(
  ancestors: Pick<Node, 'id' | 'level' | 'status' | 'title'>[]
): Pick<Node, 'id' | 'level' | 'status' | 'title'> | null {
  const level2Ancestor = ancestors.find(
    ancestor => ancestor.level === 2 && ancestor.status === 'blocked'
  );
  return level2Ancestor || null;
}

/**
 * Computes inherited_blocked status for all nodes in a tree.
 * 
 * @param nodes - All nodes in the tree
 * @returns Map of node ID to inherited_blocked status
 */
export function computeInheritedBlockedStatus(
  nodes: Node[]
): Map<string, boolean> {
  const statusMap = new Map<string, boolean>();
  const nodeMap = new Map<string, Node>();

  // Build node lookup map
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Build ancestor path for each node and compute status
  for (const node of nodes) {
    const ancestors: Node[] = [];
    let current = node.parent_id ? nodeMap.get(node.parent_id) : null;
    
    while (current) {
      ancestors.unshift(current);
      current = current.parent_id ? nodeMap.get(current.parent_id) : null;
    }

    statusMap.set(node.id, isInheritedBlocked(node, ancestors));
  }

  return statusMap;
}
