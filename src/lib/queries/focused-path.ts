import { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Node } from '@/types/database';
import type { NodeWithProgress, FocusedPathData } from '@/types/computed';
import { computeProgress } from '@/lib/progress';
import { isInheritedBlocked } from '@/lib/blocking';

/**
 * Builds the focused path data for Tower View rendering.
 * Returns the path from root to focused node, plus siblings at each level.
 * 
 * This implements Focus Mode which limits visible nodes to ~56 for performance.
 * 
 * @param treeId - The tree ID
 * @param focusedNodeId - The currently focused node ID
 * @param supabase - Supabase client
 * @returns FocusedPathData with path and siblings
 */
export async function buildFocusedPathData(
  treeId: string,
  focusedNodeId: string,
  supabase: SupabaseClient<Database>
): Promise<FocusedPathData> {
  // 1. Get the focused node
  const { data: focusedNode, error: focusedError } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', focusedNodeId)
    .single();

  if (focusedError || !focusedNode) {
    throw new Error('Focused node not found');
  }

  // 2. Build path from root to focused node
  const path: Node[] = [];
  let currentNode: Node | null = focusedNode;

  while (currentNode) {
    path.unshift(currentNode);
    if (currentNode.parent_id) {
      const { data: parent } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', currentNode.parent_id)
        .single();
      currentNode = parent;
    } else {
      currentNode = null;
    }
  }

  // 3. Get siblings at each level (nodes with same parent)
  const siblingsByLevel = new Map<number, Node[]>();

  for (const node of path) {
    let siblings: Node[];
    
    if (node.parent_id) {
      // Get siblings (nodes with same parent)
      const { data } = await supabase
        .from('nodes')
        .select('*')
        .eq('tree_id', treeId)
        .eq('parent_id', node.parent_id)
        .order('index_in_parent');
      siblings = data || [];
    } else {
      // Root node - only itself
      siblings = [node];
    }

    siblingsByLevel.set(node.level, siblings);
  }

  // 4. Get children of the focused node (if not at Level 7)
  if (focusedNode.level < 7) {
    const { data: children } = await supabase
      .from('nodes')
      .select('*')
      .eq('tree_id', treeId)
      .eq('parent_id', focusedNodeId)
      .order('index_in_parent');

    if (children && children.length > 0) {
      siblingsByLevel.set(focusedNode.level + 1, children);
    }
  }

  // 5. Compute progress and inherited_blocked for all nodes
  const allNodes = new Set<Node>();
  path.forEach(n => allNodes.add(n));
  siblingsByLevel.forEach(siblings => siblings.forEach(n => allNodes.add(n)));

  const nodesArray = Array.from(allNodes);
  const nodeMap = new Map<string, Node>();
  nodesArray.forEach(n => nodeMap.set(n.id, n));

  // Build ancestor paths for each node
  const getAncestors = (node: Node): Node[] => {
    const ancestors: Node[] = [];
    let current = node.parent_id ? nodeMap.get(node.parent_id) : null;
    
    // If parent not in our set, use the path we already have
    if (!current && node.parent_id) {
      const pathNode = path.find(p => p.id === node.parent_id);
      if (pathNode) {
        const pathIndex = path.indexOf(pathNode);
        return path.slice(0, pathIndex + 1);
      }
    }
    
    while (current) {
      ancestors.unshift(current);
      current = current.parent_id ? nodeMap.get(current.parent_id) : null;
    }
    return ancestors;
  };

  // Convert to NodeWithProgress
  const pathWithProgress: NodeWithProgress[] = path.map(node => {
    const ancestors = getAncestors(node);
    const inherited_blocked = isInheritedBlocked(node, ancestors);
    
    // Get children progress (simplified - would need full tree for accurate calculation)
    const children = siblingsByLevel.get(node.level + 1) || [];
    const childrenWithProgress = children
      .filter(c => c.parent_id === node.id)
      .map(c => ({ progress: computeProgress(c, [], isInheritedBlocked(c, [...ancestors, node])) }));
    
    const progress = computeProgress(node, childrenWithProgress, inherited_blocked);

    return {
      ...node,
      progress,
      inherited_blocked,
      children_count: childrenWithProgress.length,
      children_generated: childrenWithProgress.length > 0,
    };
  });

  const siblingsByLevelWithProgress = new Map<number, NodeWithProgress[]>();
  
  siblingsByLevel.forEach((siblings, level) => {
    const siblingsWithProgress = siblings.map(node => {
      const ancestors = getAncestors(node);
      const inherited_blocked = isInheritedBlocked(node, ancestors);
      
      // Simplified progress calculation
      const progress = computeProgress(node, [], inherited_blocked);

      return {
        ...node,
        progress,
        inherited_blocked,
        children_count: 0, // Would need to query for accurate count
        children_generated: false,
      };
    });
    siblingsByLevelWithProgress.set(level, siblingsWithProgress);
  });

  return {
    path: pathWithProgress,
    siblings_by_level: siblingsByLevelWithProgress,
  };
}

/**
 * Gets the root node of a tree with progress computed.
 */
export async function getRootNodeWithProgress(
  treeId: string,
  supabase: SupabaseClient<Database>
): Promise<NodeWithProgress | null> {
  const { data: rootNode, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('tree_id', treeId)
    .eq('level', 1)
    .single();

  if (error || !rootNode) {
    return null;
  }

  // Get all nodes to compute accurate progress
  const { data: allNodes } = await supabase
    .from('nodes')
    .select('*')
    .eq('tree_id', treeId)
    .order('level')
    .order('index_in_parent');

  if (!allNodes) {
    return {
      ...rootNode,
      progress: computeProgress(rootNode, [], false),
      inherited_blocked: false,
      children_count: 0,
      children_generated: false,
    };
  }

  // Build tree structure and compute progress bottom-up
  const nodeMap = new Map<string, Node>();
  const childrenMap = new Map<string, Node[]>();
  const progressMap = new Map<string, number>();

  allNodes.forEach(n => {
    nodeMap.set(n.id, n);
    const parentId = n.parent_id || 'root';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(n);
  });

  // Process from deepest level to root
  for (let level = 7; level >= 1; level--) {
    const levelNodes = allNodes.filter(n => n.level === level);
    
    for (const node of levelNodes) {
      const children = childrenMap.get(node.id) || [];
      const childrenWithProgress = children.map(c => ({
        progress: progressMap.get(c.id) || 0,
      }));

      // Get ancestors for inherited_blocked check
      const ancestors: Node[] = [];
      let current = node.parent_id ? nodeMap.get(node.parent_id) : null;
      while (current) {
        ancestors.unshift(current);
        current = current.parent_id ? nodeMap.get(current.parent_id) : null;
      }

      const inherited_blocked = isInheritedBlocked(node, ancestors);
      const progress = computeProgress(node, childrenWithProgress, inherited_blocked);
      progressMap.set(node.id, progress);
    }
  }

  const rootChildren = childrenMap.get(rootNode.id) || [];

  return {
    ...rootNode,
    progress: progressMap.get(rootNode.id) || 0,
    inherited_blocked: false,
    children_count: rootChildren.length,
    children_generated: rootChildren.length > 0,
  };
}
