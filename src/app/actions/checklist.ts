'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ChecklistItem, ChecklistStatus } from '@/types/database';

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

export async function getChecklistItems(nodeId: string): Promise<ActionResult<ChecklistItem[]>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('node_id', nodeId)
      .eq('user_id', userId)
      .order('sort_order');

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch checklist items' };
  }
}

/**
 * Get checklist items for multiple nodes at once (for progress calculation)
 */
export async function getChecklistItemsForNodes(nodeIds: string[]): Promise<ActionResult<Map<string, ChecklistItem[]>>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    if (nodeIds.length === 0) {
      return { data: new Map() };
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .in('node_id', nodeIds)
      .eq('user_id', userId)
      .order('sort_order');

    if (error) {
      return { error: error.message };
    }

    // Group by node_id
    const itemsByNode = new Map<string, ChecklistItem[]>();
    for (const item of (data || [])) {
      if (!itemsByNode.has(item.node_id)) {
        itemsByNode.set(item.node_id, []);
      }
      itemsByNode.get(item.node_id)!.push(item);
    }

    return { data: itemsByNode };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch checklist items' };
  }
}

export async function createChecklistItem(
  nodeId: string,
  title: string = 'New Item'
): Promise<ActionResult<ChecklistItem>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    // Verify the node belongs to the user and is Level 3
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('id, level, tree_id')
      .eq('id', nodeId)
      .eq('user_id', userId)
      .single();

    if (nodeError || !node) {
      return { error: 'Node not found' };
    }

    if (node.level !== 3) {
      return { error: 'Checklist items can only be added to Level 3 nodes' };
    }

    // Get the max sort_order for this node
    const { data: maxOrder } = await supabase
      .from('checklist_items')
      .select('sort_order')
      .eq('node_id', nodeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = (maxOrder?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        node_id: nodeId,
        user_id: userId,
        title,
        status: 'todo' as ChecklistStatus,
        sort_order: newSortOrder,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create checklist item' };
  }
}

export async function updateChecklistItem(
  itemId: string,
  input: {
    title?: string;
    status?: ChecklistStatus;
    notes?: string | null;
    due_date?: string | null;
  }
): Promise<ActionResult<ChecklistItem>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('checklist_items')
      .update(input)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update checklist item' };
  }
}

export async function deleteChecklistItem(itemId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete checklist item' };
  }
}

export async function reorderChecklistItems(
  nodeId: string,
  itemIds: string[]
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    // Update sort_order for each item
    const updates = itemIds.map((id, index) => 
      supabase
        .from('checklist_items')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('user_id', userId)
        .eq('node_id', nodeId)
    );

    await Promise.all(updates);

    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to reorder checklist items' };
  }
}
