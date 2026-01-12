'use server';

import { createClient } from '@/lib/supabase/server';
import type { CanvasExportData } from '@/types/computed';

export async function exportCanvas(canvasId: string): Promise<{ data: CanvasExportData | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: 'Unauthorized' };
  }

  // Get canvas
  const { data: canvas, error: canvasError } = await supabase
    .from('canvases')
    .select('*')
    .eq('id', canvasId)
    .eq('user_id', user.id)
    .single();

  if (canvasError || !canvas) {
    return { data: null, error: 'Canvas not found' };
  }

  // Get all trees in canvas
  const { data: trees, error: treesError } = await supabase
    .from('plan_trees')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('user_id', user.id);

  if (treesError) {
    return { data: null, error: treesError.message };
  }

  // Get all nodes for all trees
  const treeIds = (trees || []).map(t => t.id);
  const { data: allNodes, error: nodesError } = await supabase
    .from('nodes')
    .select('*')
    .in('tree_id', treeIds)
    .eq('user_id', user.id);

  if (nodesError) {
    return { data: null, error: nodesError.message };
  }

  // Build export data
  const exportData: CanvasExportData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    canvas: {
      id: canvas.id,
      name: canvas.name,
      is_archived: canvas.is_archived,
      created_at: canvas.created_at,
      updated_at: canvas.updated_at,
    },
    trees: (trees || []).map(tree => ({
      tree: {
        id: tree.id,
        title: tree.title,
        created_at: tree.created_at,
        updated_at: tree.updated_at,
      },
      nodes: (allNodes || [])
        .filter(n => n.tree_id === tree.id)
        .map(node => ({
          id: node.id,
          parent_id: node.parent_id,
          level: node.level,
          index_in_parent: node.index_in_parent,
          title: node.title,
          description: node.description,
          status: node.status,
          due_date: node.due_date,
          reminder_enabled: node.reminder_enabled,
          reminder_time: node.reminder_time,
          reminder_timezone: node.reminder_timezone,
          created_at: node.created_at,
          updated_at: node.updated_at,
        })),
    })),
  };

  return { data: exportData, error: null };
}
