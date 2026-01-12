import { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Node, PlanTree } from '@/types/database';

const CHILDREN_PER_NODE = 8;
const MAX_LEVEL = 7;
const DEFAULT_INITIAL_LEVEL = 3;

/**
 * Generates child nodes for a parent node.
 * Creates exactly 8 children with index_in_parent 0-7.
 * 
 * Property 5: Node Structure Invariants
 * - Every non-leaf node (Levels 1-6) has exactly 8 children
 * - No node has level > 7
 * - Level 7 nodes have no children
 * 
 * @param parentNode - The parent node to generate children for
 * @param userId - The user ID for ownership
 * @param supabase - Supabase client
 * @returns Array of created child nodes
 */
export async function generateChildNodes(
  parentNode: Pick<Node, 'id' | 'tree_id' | 'level' | 'title'>,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<Node[]> {
  // Don't generate children for Level 7 (leaf nodes)
  if (parentNode.level >= MAX_LEVEL) {
    return [];
  }

  const childLevel = parentNode.level + 1;
  const children: Database['public']['Tables']['nodes']['Insert'][] = [];

  // Generate exactly 8 children
  for (let i = 0; i < CHILDREN_PER_NODE; i++) {
    children.push({
      tree_id: parentNode.tree_id,
      user_id: userId,
      parent_id: parentNode.id,
      level: childLevel,
      index_in_parent: i,
      title: `${parentNode.title} - Task ${i + 1}`,
      description: null,
      status: 'in_progress',
      due_date: null,
      reminder_enabled: false,
      reminder_time: null,
      reminder_timezone: null,
    });
  }

  const { data, error } = await supabase
    .from('nodes')
    .insert(children)
    .select();

  if (error) {
    throw new Error(`Failed to generate child nodes: ${error.message}`);
  }

  return data;
}

/**
 * Recursively generates nodes up to a specified level.
 * 
 * @param parentNode - The parent node to start from
 * @param maxLevel - Maximum level to generate (inclusive)
 * @param userId - The user ID for ownership
 * @param supabase - Supabase client
 */
async function generateLevelsRecursively(
  parentNode: Pick<Node, 'id' | 'tree_id' | 'level' | 'title'>,
  maxLevel: number,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  if (parentNode.level >= maxLevel || parentNode.level >= MAX_LEVEL) {
    return;
  }

  const children = await generateChildNodes(parentNode, userId, supabase);

  // Recursively generate for each child
  for (const child of children) {
    await generateLevelsRecursively(child, maxLevel, userId, supabase);
  }
}

/**
 * Creates a new Plan Tree with initial node structure.
 * 
 * Property 6: Lazy Generation Correctness
 * - Root node (Level 1) exists immediately
 * - Nodes up to Level 3 are generated with exactly 8 children per node
 * - Total initial node count: 1 + 8 + 64 = 73 nodes
 * 
 * @param canvasId - The canvas to create the tree in
 * @param userId - The user ID for ownership
 * @param title - The main goal title
 * @param generateAllLevels - If true, generates all levels up to 7
 * @param supabase - Supabase client
 * @returns The created plan tree
 */
export async function createPlanTree(
  canvasId: string,
  userId: string,
  title: string,
  generateAllLevels: boolean = false,
  supabase: SupabaseClient<Database>
): Promise<PlanTree> {
  // 1. Create the tree record
  const { data: tree, error: treeError } = await supabase
    .from('plan_trees')
    .insert({
      canvas_id: canvasId,
      user_id: userId,
      title,
    })
    .select()
    .single();

  if (treeError) {
    throw new Error(`Failed to create plan tree: ${treeError.message}`);
  }

  // 2. Create root node (Level 1)
  const { data: rootNode, error: rootError } = await supabase
    .from('nodes')
    .insert({
      tree_id: tree.id,
      user_id: userId,
      parent_id: null,
      level: 1,
      index_in_parent: 0,
      title: title,
      status: 'in_progress',
    })
    .select()
    .single();

  if (rootError) {
    throw new Error(`Failed to create root node: ${rootError.message}`);
  }

  // 3. Generate initial levels (up to Level 3 or all if requested)
  const maxInitialLevel = generateAllLevels ? MAX_LEVEL : DEFAULT_INITIAL_LEVEL;
  await generateLevelsRecursively(rootNode, maxInitialLevel, userId, supabase);

  return tree;
}

/**
 * Expands a node by generating its children if they don't exist.
 * Used for lazy generation when user navigates to deeper levels.
 * 
 * @param nodeId - The node to expand
 * @param userId - The user ID for ownership verification
 * @param supabase - Supabase client
 * @returns Array of child nodes (existing or newly created)
 */
export async function expandNode(
  nodeId: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<Node[]> {
  // Get the node
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .single();

  if (nodeError) {
    throw new Error(`Failed to fetch node: ${nodeError.message}`);
  }

  // Check if children already exist
  const { data: existingChildren, error: childrenError } = await supabase
    .from('nodes')
    .select('*')
    .eq('parent_id', nodeId)
    .order('index_in_parent');

  if (childrenError) {
    throw new Error(`Failed to fetch children: ${childrenError.message}`);
  }

  // If children exist, return them
  if (existingChildren && existingChildren.length > 0) {
    return existingChildren;
  }

  // Generate children if this is not a leaf node
  if (node.level < MAX_LEVEL) {
    return await generateChildNodes(node, userId, supabase);
  }

  return [];
}

/**
 * Checks if a node has children generated.
 */
export async function hasChildrenGenerated(
  nodeId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { count, error } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', nodeId);

  if (error) {
    throw new Error(`Failed to check children: ${error.message}`);
  }

  return (count || 0) > 0;
}

/**
 * Gets the count of children for a node.
 */
export async function getChildrenCount(
  nodeId: string,
  supabase: SupabaseClient<Database>
): Promise<number> {
  const { count, error } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', nodeId);

  if (error) {
    throw new Error(`Failed to count children: ${error.message}`);
  }

  return count || 0;
}
