'use server';

import { createClient } from '@/lib/supabase/server';
import { updateNodeSchema } from '@/lib/validations/node';
import { expandNode as expandNodeLib } from '@/lib/tree-generation';
import { revalidatePath } from 'next/cache';
import type { Node } from '@/types/database';

export type ActionResult<T = void> = {
  data?: T;
  error?: string;
};

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return user.id;
}

export async function updateNode(
  nodeId: string,
  input: {
    title?: string;
    description?: string | null;
    status?: 'done' | 'in_progress' | 'blocked';
    due_date?: string | null;
    reminder_enabled?: boolean;
    reminder_time?: string | null;
    reminder_timezone?: string | null;
  }
): Promise<ActionResult<Node>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const validationResult = updateNodeSchema.safeParse(input);
    if (!validationResult.success) {
      return { error: validationResult.error.errors[0].message };
    }

    // Verify ownership and get tree info for revalidation
    const { data: existing, error: fetchError } = await supabase
      .from('nodes')
      .select('id, tree_id')
      .eq('id', nodeId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Node not found' };
    }

    const { data, error } = await supabase
      .from('nodes')
      .update(validationResult.data)
      .eq('id', nodeId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Get canvas_id for revalidation
    const { data: tree } = await supabase
      .from('plan_trees')
      .select('canvas_id')
      .eq('id', existing.tree_id)
      .single();

    if (tree) {
      revalidatePath(`/app/canvas/${tree.canvas_id}/tree/${existing.tree_id}`);
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update node' };
  }
}

export async function expandNode(nodeId: string): Promise<ActionResult<Node[]>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const children = await expandNodeLib(nodeId, userId, supabase);

    return { data: children };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to expand node' };
  }
}

export async function getNode(nodeId: string): Promise<ActionResult<Node>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch node' };
  }
}

export async function getNodeChildren(nodeId: string): Promise<ActionResult<Node[]>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('parent_id', nodeId)
      .eq('user_id', userId)
      .order('index_in_parent');

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch children' };
  }
}

export async function getTreeNodes(treeId: string): Promise<ActionResult<Node[]>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('tree_id', treeId)
      .eq('user_id', userId)
      .order('level')
      .order('index_in_parent');

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch nodes' };
  }
}

export async function getRootNode(treeId: string): Promise<ActionResult<Node>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('tree_id', treeId)
      .eq('user_id', userId)
      .eq('level', 1)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch root node' };
  }
}

export async function markNodeDone(nodeId: string): Promise<ActionResult<Node>> {
  return updateNode(nodeId, { status: 'done' });
}

export async function markNodeBlocked(nodeId: string): Promise<ActionResult<Node>> {
  return updateNode(nodeId, { status: 'blocked' });
}

export async function markNodeInProgress(nodeId: string): Promise<ActionResult<Node>> {
  return updateNode(nodeId, { status: 'in_progress' });
}


/**
 * Duplicate a node and all its descendants
 * Creates new nodes with new UUIDs but same data
 */
export async function duplicateSubtree(
  nodeId: string,
  newParentId: string | null = null
): Promise<ActionResult<Node>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    // Get the source node
    const { data: sourceNode, error: sourceError } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('user_id', userId)
      .single();

    if (sourceError || !sourceNode) {
      return { error: 'Source node not found' };
    }

    // Get all descendants
    const { data: allNodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .eq('tree_id', sourceNode.tree_id)
      .eq('user_id', userId);

    if (nodesError) {
      return { error: nodesError.message };
    }

    // Build a map of descendants
    const nodeMap = new Map<string, Node>();
    const childrenMap = new Map<string, Node[]>();
    
    allNodes?.forEach(node => {
      nodeMap.set(node.id, node);
      const parentId = node.parent_id || 'root';
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node);
    });

    // Collect all nodes in the subtree
    const subtreeNodes: Node[] = [];
    const collectSubtree = (id: string) => {
      const node = nodeMap.get(id);
      if (node) {
        subtreeNodes.push(node);
        const children = childrenMap.get(id) || [];
        children.forEach(child => collectSubtree(child.id));
      }
    };
    collectSubtree(nodeId);

    // Create ID mapping for new nodes
    const idMapping = new Map<string, string>();
    subtreeNodes.forEach(node => {
      idMapping.set(node.id, crypto.randomUUID());
    });

    // Create new nodes with mapped IDs
    const newNodes = subtreeNodes.map(node => ({
      id: idMapping.get(node.id)!,
      tree_id: node.tree_id,
      user_id: userId,
      parent_id: node.id === nodeId 
        ? newParentId 
        : (node.parent_id ? idMapping.get(node.parent_id) : null),
      level: node.level,
      index_in_parent: node.index_in_parent,
      title: node.title,
      description: node.description,
      status: node.status,
      due_date: node.due_date,
      reminder_enabled: false, // Reset reminders for duplicated nodes
      reminder_time: null,
      reminder_timezone: null,
    }));

    // Insert all new nodes
    const { data: insertedNodes, error: insertError } = await supabase
      .from('nodes')
      .insert(newNodes)
      .select();

    if (insertError) {
      return { error: insertError.message };
    }

    // Return the root of the duplicated subtree
    const newRootId = idMapping.get(nodeId);
    const newRoot = insertedNodes?.find(n => n.id === newRootId);

    if (!newRoot) {
      return { error: 'Failed to create duplicated subtree' };
    }

    // Revalidate
    const { data: tree } = await supabase
      .from('plan_trees')
      .select('canvas_id')
      .eq('id', sourceNode.tree_id)
      .single();

    if (tree) {
      revalidatePath(`/app/canvas/${tree.canvas_id}/tree/${sourceNode.tree_id}`);
    }

    return { data: newRoot };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to duplicate subtree' };
  }
}
