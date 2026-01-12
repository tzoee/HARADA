import { createClient } from '@/lib/supabase/server';
import type { Node } from '@/types/database';

export interface ReminderNode extends Node {
  tree_title: string;
  canvas_name: string;
  user_email: string;
  user_language: 'en' | 'id';
}

/**
 * Query nodes that need reminder notifications
 * Finds nodes where:
 * - reminder_enabled = true
 * - due_date is today (H-0) or tomorrow (H-1)
 * - user's reminder_pref is not 'off'
 */
export async function queryDueReminders(): Promise<ReminderNode[]> {
  const supabase = await createClient();
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Query nodes with due dates today or tomorrow
  const { data: nodes, error } = await supabase
    .from('nodes')
    .select(`
      *,
      plan_trees!inner (
        title,
        canvases!inner (
          name
        )
      ),
      user_settings:user_id (
        language,
        reminder_pref
      )
    `)
    .eq('reminder_enabled', true)
    .or(`due_date.eq.${todayStr},due_date.eq.${tomorrowStr}`)
    .not('user_settings.reminder_pref', 'eq', 'off');

  if (error || !nodes) {
    console.error('Error querying reminders:', error);
    return [];
  }

  // Transform to ReminderNode format
  return nodes.map((node: Record<string, unknown>) => {
    const tree = node.plan_trees as { title: string; canvases: { name: string } };
    const settings = node.user_settings as { language: 'en' | 'id'; reminder_pref: string } | null;
    
    return {
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
      tree_title: tree.title,
      canvas_name: tree.canvases.name,
      user_email: '', // Would need to join with auth.users
      user_language: settings?.language || 'en',
    };
  });
}

/**
 * Get reminder email templates
 */
export function getReminderEmailTemplate(
  node: ReminderNode,
  daysUntilDue: number
): { subject: string; html: string } {
  const isToday = daysUntilDue === 0;
  const language = node.user_language;

  const templates = {
    en: {
      subject: isToday 
        ? `⏰ Task Due Today: ${node.title}`
        : `📅 Task Due Tomorrow: ${node.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Harada Pillars Reminder</h2>
          <p>Your task <strong>${node.title}</strong> is due ${isToday ? 'today' : 'tomorrow'}.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Canvas:</strong> ${node.canvas_name}</p>
            <p style="margin: 8px 0 0;"><strong>Goal:</strong> ${node.tree_title}</p>
            <p style="margin: 8px 0 0;"><strong>Level:</strong> ${node.level}</p>
          </div>
          <p>Keep up the great work on your goals!</p>
        </div>
      `,
    },
    id: {
      subject: isToday 
        ? `⏰ Tugas Jatuh Tempo Hari Ini: ${node.title}`
        : `📅 Tugas Jatuh Tempo Besok: ${node.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Pengingat Harada Pillars</h2>
          <p>Tugas <strong>${node.title}</strong> jatuh tempo ${isToday ? 'hari ini' : 'besok'}.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Canvas:</strong> ${node.canvas_name}</p>
            <p style="margin: 8px 0 0;"><strong>Tujuan:</strong> ${node.tree_title}</p>
            <p style="margin: 8px 0 0;"><strong>Level:</strong> ${node.level}</p>
          </div>
          <p>Terus semangat mencapai tujuanmu!</p>
        </div>
      `,
    },
  };

  return templates[language];
}
