'use server';

import { createClient } from '@/lib/supabase/server';
import { createPlanTreeSchema, updatePlanTreeSchema } from '@/lib/validations/canvas';
import { createPlanTree as createPlanTreeLib } from '@/lib/tree-generation';
import { revalidatePath } from 'next/cache';
import type { PlanTree } from '@/types/database';

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

export async function createTree(
  input: { canvas_id: string; title?: string; generate_all_levels?: boolean }
): Promise<ActionResult<PlanTree>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const validationResult = createPlanTreeSchema.safeParse(input);
    if (!validationResult.success) {
      return { error: validationResult.error.errors[0].message };
    }

    const { canvas_id, title, generate_all_levels } = validationResult.data;

    // Verify canvas ownership
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .select('id')
      .eq('id', canvas_id)
      .eq('user_id', userId)
      .single();

    if (canvasError || !canvas) {
      return { error: 'Canvas not found' };
    }

    // Create tree with initial node structure
    const tree = await createPlanTreeLib(
      canvas_id,
      userId,
      title,
      generate_all_levels,
      supabase
    );

    revalidatePath(`/app/canvas/${canvas_id}`);
    return { data: tree };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create tree' };
  }
}

export async function updateTree(
  treeId: string,
  input: { title?: string }
): Promise<ActionResult<PlanTree>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const validationResult = updatePlanTreeSchema.safeParse(input);
    if (!validationResult.success) {
      return { error: validationResult.error.errors[0].message };
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('plan_trees')
      .select('id, canvas_id')
      .eq('id', treeId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Tree not found' };
    }

    const { data, error } = await supabase
      .from('plan_trees')
      .update(validationResult.data)
      .eq('id', treeId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/app/canvas/${existing.canvas_id}`);
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update tree' };
  }
}

export async function deleteTree(treeId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    // Verify ownership and get canvas_id for revalidation
    const { data: existing, error: fetchError } = await supabase
      .from('plan_trees')
      .select('id, canvas_id')
      .eq('id', treeId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Tree not found' };
    }

    // Delete tree (cascades to nodes via FK)
    const { error } = await supabase
      .from('plan_trees')
      .delete()
      .eq('id', treeId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/app/canvas/${existing.canvas_id}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete tree' };
  }
}

export async function getTrees(canvasId: string): Promise<ActionResult<PlanTree[]>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('plan_trees')
      .select('*')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch trees' };
  }
}

export async function getTree(treeId: string): Promise<ActionResult<PlanTree>> {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('plan_trees')
      .select('*')
      .eq('id', treeId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch tree' };
  }
}
