'use server';

import { createClient } from '@/lib/supabase/server';
import { updateUserSettingsSchema } from '@/lib/validations/settings';
import type { UserSettings } from '@/types/database';

export async function getUserSettings(): Promise<{ data: UserSettings | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateUserSettings(
  updates: {
    language?: 'en' | 'id';
    theme?: 'dark' | 'light';
    reminder_pref?: 'off' | 'daily_summary' | 'due_only';
    timezone?: string;
  }
): Promise<{ data: UserSettings | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: 'Unauthorized' };
  }

  // Validate input
  const validation = updateUserSettingsSchema.safeParse(updates);
  if (!validation.success) {
    return { data: null, error: validation.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from('user_settings')
    .update(validation.data)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
