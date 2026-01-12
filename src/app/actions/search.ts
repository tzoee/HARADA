'use server';

import { createClient } from '@/lib/supabase/server';
import type { SearchResult } from '@/types/computed';

export async function searchNodes(query: string): Promise<{ data: SearchResult[] | null; error: string | null }> {
  if (!query || query.trim().length < 2) {
    return { data: [], error: null };
  }

  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: 'Unauthorized' };
  }

  // Search nodes by title (case-insensitive)
  const searchTerm = `%${query.trim()}%`;
  
  const { data: nodes, error: nodesError } = await supabase
    .from('nodes')
    .select(`
      *,
      plan_trees!inner (
        id,
        title,
        canvas_id,
        canvases!inner (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .ilike('title', searchTerm)
    .limit(20);

  if (nodesError) {
    return { data: null, error: nodesError.message };
  }

  // Transform results
  const results: SearchResult[] = (nodes || []).map((node: Record<string, unknown>) => {
    const tree = node.plan_trees as { id: string; title: string; canvas_id: string; canvases: { id: string; name: string } };
    
    return {
      node: {
        id: node.id as string,
        tree_id: node.tree_id as string,
        user_id: node.user_id as string,
        parent_id: node.parent_id as string | null,
        level: node.level as number,
        index_in_parent: node.index_in_parent as number,
        title: node.title as string,
        description: node.description as string | null,
        status: node.status as 'done' | 'in_progress' | 'blocked',
        due_date: node.due_date as string | null,
        reminder_enabled: node.reminder_enabled as boolean,
        reminder_time: node.reminder_time as string | null,
        reminder_timezone: node.reminder_timezone as string | null,
        created_at: node.created_at as string,
        updated_at: node.updated_at as string,
      },
      canvas_name: tree.canvases.name,
      canvas_id: tree.canvases.id,
      tree_title: tree.title,
      tree_id: tree.id,
      path: [], // Path would require additional queries, keeping simple for now
    };
  });

  return { data: results, error: null };
}
