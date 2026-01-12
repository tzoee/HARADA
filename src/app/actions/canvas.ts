'use server';

import { createClient } from '@/lib/supabase/server';
import { createCanvasSchema, updateCanvasSchema } from '@/lib/validations/canvas';
import { revalidatePath } from 'next/cache';
import type { Canvas } from '@/types/database';

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

export async function createCanvas(
  input?: { name?: string }
): Promise<ActionResult<Canvas>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const validationResult = createCanvasSchema.safeParse(input || {});
    if (!validationResult.success) {
      return { error: validationResult.error.errors[0].message };
    }

    const { data, error } = await supabase
      .from('canvases')
      .insert({
        user_id: userId,
        name: validationResult.data.name,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/app');
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create canvas' };
  }
}

export async function updateCanvas(
  canvasId: string,
  input: { name?: string; is_archived?: boolean }
): Promise<ActionResult<Canvas>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const validationResult = updateCanvasSchema.safeParse(input);
    if (!validationResult.success) {
      return { error: validationResult.error.errors[0].message };
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('canvases')
      .select('id')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Canvas not found' };
    }

    const { data, error } = await supabase
      .from('canvases')
      .update(validationResult.data)
      .eq('id', canvasId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/app');
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update canvas' };
  }
}

export async function archiveCanvas(canvasId: string): Promise<ActionResult> {
  return updateCanvas(canvasId, { is_archived: true });
}

export async function unarchiveCanvas(canvasId: string): Promise<ActionResult> {
  return updateCanvas(canvasId, { is_archived: false });
}

export async function deleteCanvas(canvasId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('canvases')
      .select('id')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Canvas not found' };
    }

    // Delete canvas (cascades to trees and nodes via FK)
    const { error } = await supabase
      .from('canvases')
      .delete()
      .eq('id', canvasId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/app');
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete canvas' };
  }
}

export async function getCanvases(
  includeArchived: boolean = false
): Promise<ActionResult<Canvas[]>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    let query = supabase
      .from('canvases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch canvases' };
  }
}

export async function getCanvas(canvasId: string): Promise<ActionResult<Canvas>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch canvas' };
  }
}


export async function duplicateCanvas(canvasId: string): Promise<ActionResult<Canvas>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    // Get original canvas
    const { data: originalCanvas, error: canvasError } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (canvasError || !originalCanvas) {
      return { error: 'Canvas not found' };
    }

    // Create new canvas
    const { data: newCanvas, error: newCanvasError } = await supabase
      .from('canvases')
      .insert({
        user_id: userId,
        name: `${originalCanvas.name} (Copy)`,
        is_archived: false,
      })
      .select()
      .single();

    if (newCanvasError || !newCanvas) {
      return { error: 'Failed to create canvas copy' };
    }

    // Get all trees in original canvas
    const { data: trees, error: treesError } = await supabase
      .from('plan_trees')
      .select('*')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId);

    if (treesError) {
      return { error: 'Failed to fetch trees' };
    }

    // Duplicate each tree with its nodes
    for (const tree of trees || []) {
      // Create new tree
      const { data: newTree, error: newTreeError } = await supabase
        .from('plan_trees')
        .insert({
          canvas_id: newCanvas.id,
          user_id: userId,
          title: tree.title,
        })
        .select()
        .single();

      if (newTreeError || !newTree) {
        continue; // Skip this tree on error
      }

      // Get all nodes in original tree
      const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('*')
        .eq('tree_id', tree.id)
        .eq('user_id', userId)
        .order('level')
        .order('index_in_parent');

      if (nodesError || !nodes) {
        continue;
      }

      // Map old node IDs to new node IDs
      const nodeIdMap = new Map<string, string>();

      // Insert nodes level by level to maintain parent references
      for (const node of nodes) {
        const newParentId = node.parent_id ? nodeIdMap.get(node.parent_id) : null;

        const { data: newNode, error: newNodeError } = await supabase
          .from('nodes')
          .insert({
            tree_id: newTree.id,
            user_id: userId,
            parent_id: newParentId,
            level: node.level,
            index_in_parent: node.index_in_parent,
            title: node.title,
            description: node.description,
            status: node.status,
            due_date: node.due_date,
            reminder_enabled: node.reminder_enabled,
            reminder_time: node.reminder_time,
            reminder_timezone: node.reminder_timezone,
          })
          .select()
          .single();

        if (!newNodeError && newNode) {
          nodeIdMap.set(node.id, newNode.id);
        }
      }
    }

    revalidatePath('/app');
    return { data: newCanvas };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to duplicate canvas' };
  }
}
