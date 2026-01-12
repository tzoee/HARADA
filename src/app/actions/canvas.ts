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
      } as never)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/app');
    return { data: data as Canvas };
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
      .update(validationResult.data as never)
      .eq('id', canvasId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/app');
    return { data: data as Canvas };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update canvas' };
  }
}

export async function archiveCanvas(canvasId: string): Promise<ActionResult<Canvas>> {
  return updateCanvas(canvasId, { is_archived: true });
}

export async function unarchiveCanvas(canvasId: string): Promise<ActionResult<Canvas>> {
  return updateCanvas(canvasId, { is_archived: false });
}

export async function deleteCanvas(canvasId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('canvases')
      .select('id')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Canvas not found' };
    }

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

    return { data: (data || []) as Canvas[] };
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

    return { data: data as Canvas };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch canvas' };
  }
}

export async function duplicateCanvas(canvasId: string): Promise<ActionResult<Canvas>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data: originalCanvas, error: canvasError } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (canvasError || !originalCanvas) {
      return { error: 'Canvas not found' };
    }

    const { data: newCanvas, error: newCanvasError } = await supabase
      .from('canvases')
      .insert({
        user_id: userId,
        name: `${(originalCanvas as Canvas).name} (Copy)`,
        is_archived: false,
      } as never)
      .select()
      .single();

    if (newCanvasError || !newCanvas) {
      return { error: 'Failed to create canvas copy' };
    }

    const { data: trees, error: treesError } = await supabase
      .from('plan_trees')
      .select('*')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId);

    if (treesError) {
      return { error: 'Failed to fetch trees' };
    }

    for (const tree of (trees || []) as Array<{ id: string; title: string }>) {
      const { data: newTree, error: newTreeError } = await supabase
        .from('plan_trees')
        .insert({
          canvas_id: (newCanvas as Canvas).id,
          user_id: userId,
          title: tree.title,
        } as never)
        .select()
        .single();

      if (newTreeError || !newTree) {
        continue;
      }

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

      const nodeIdMap = new Map<string, string>();

      for (const node of nodes as Array<{
        id: string;
        parent_id: string | null;
        level: number;
        index_in_parent: number;
        title: string;
        description: string | null;
        status: string;
        due_date: string | null;
        reminder_enabled: boolean;
        reminder_time: string | null;
        reminder_timezone: string | null;
      }>) {
        const newParentId = node.parent_id ? nodeIdMap.get(node.parent_id) : null;

        const { data: newNode, error: newNodeError } = await supabase
          .from('nodes')
          .insert({
            tree_id: (newTree as { id: string }).id,
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
          } as never)
          .select()
          .single();

        if (!newNodeError && newNode) {
          nodeIdMap.set(node.id, (newNode as { id: string }).id);
        }
      }
    }

    revalidatePath('/app');
    return { data: newCanvas as Canvas };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to duplicate canvas' };
  }
}
