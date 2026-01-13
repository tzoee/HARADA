import { SupabaseClient } from '@supabase/supabase-js';
import type { Node, PlanTree } from '@/types/database';

const CHILDREN_PER_NODE = 8;
const MAX_LEVEL = 3;
const DEFAULT_INITIAL_LEVEL = 3;

type AnySupabaseClient = SupabaseClient<Record<string, unknown>>;

/**
 * Generates child nodes for a parent node.
 * Creates exactly 8 children with index_in_parent 0-7.
 */
export async function generateChildNodes(
  parentNode: Pick<Node, 'id' | 'tree_id' | 'level' | 'title'>,
  userId: string,
  supabase: AnySupabaseClient
): Promise<Node[]> {
  if (parentNode.level >= MAX_LEVEL) {
    return [];
  }

  const childLevel = parentNode.level + 1;
  const children = [];

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
    .insert(children as never)
    .select();

  if (error) {
    throw new Error(`Failed to generate child nodes: ${error.message}`);
  }

  return data as Node[];
}

async function generateLevelsRecursively(
  parentNode: Pick<Node, 'id' | 'tree_id' | 'level' | 'title'>,
  maxLevel: number,
  userId: string,
  supabase: AnySupabaseClient
): Promise<void> {
  if (parentNode.level >= maxLevel || parentNode.level >= MAX_LEVEL) {
    return;
  }

  const children = await generateChildNodes(parentNode, userId, supabase);

  for (const child of children) {
    await generateLevelsRecursively(child, maxLevel, userId, supabase);
  }
}

export async function createPlanTree(
  canvasId: string,
  userId: string,
  title: string,
  generateAllLevels: boolean = false,
  supabase: AnySupabaseClient
): Promise<PlanTree> {
  const { data: tree, error: treeError } = await supabase
    .from('plan_trees')
    .insert({
      canvas_id: canvasId,
      user_id: userId,
      title,
    } as never)
    .select()
    .single();

  if (treeError) {
    throw new Error(`Failed to create plan tree: ${treeError.message}`);
  }

  const { data: rootNode, error: rootError } = await supabase
    .from('nodes')
    .insert({
      tree_id: (tree as PlanTree).id,
      user_id: userId,
      parent_id: null,
      level: 1,
      index_in_parent: 0,
      title: title,
      status: 'in_progress',
    } as never)
    .select()
    .single();

  if (rootError) {
    throw new Error(`Failed to create root node: ${rootError.message}`);
  }

  const maxInitialLevel = generateAllLevels ? MAX_LEVEL : DEFAULT_INITIAL_LEVEL;
  await generateLevelsRecursively(rootNode as Node, maxInitialLevel, userId, supabase);

  return tree as PlanTree;
}

export async function expandNode(
  nodeId: string,
  userId: string,
  supabase: AnySupabaseClient
): Promise<Node[]> {
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .single();

  if (nodeError) {
    throw new Error(`Failed to fetch node: ${nodeError.message}`);
  }

  const { data: existingChildren, error: childrenError } = await supabase
    .from('nodes')
    .select('*')
    .eq('parent_id', nodeId)
    .order('index_in_parent');

  if (childrenError) {
    throw new Error(`Failed to fetch children: ${childrenError.message}`);
  }

  if (existingChildren && existingChildren.length > 0) {
    return existingChildren as Node[];
  }

  if ((node as Node).level < MAX_LEVEL) {
    return await generateChildNodes(node as Node, userId, supabase);
  }

  return [];
}

export async function hasChildrenGenerated(
  nodeId: string,
  supabase: AnySupabaseClient
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

export async function getChildrenCount(
  nodeId: string,
  supabase: AnySupabaseClient
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
