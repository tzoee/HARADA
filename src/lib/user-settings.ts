import { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserSettings } from '@/types/database';

/**
 * Ensures user settings exist for the given user.
 * Creates default settings if they don't exist.
 */
export async function ensureUserSettings(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserSettings> {
  // Try to get existing settings
  const { data: existingSettings, error: fetchError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingSettings) {
    return existingSettings;
  }

  // If not found (PGRST116), create default settings
  if (fetchError?.code === 'PGRST116') {
    const defaultSettings = {
      user_id: userId,
      language: 'en' as const,
      theme: 'dark' as const,
      reminder_pref: 'due_only' as const,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };

    const { data: newSettings, error: insertError } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create user settings: ${insertError.message}`);
    }

    return newSettings;
  }

  // Other errors
  if (fetchError) {
    throw new Error(`Failed to fetch user settings: ${fetchError.message}`);
  }

  throw new Error('Unexpected state in ensureUserSettings');
}

/**
 * Gets user settings, returning null if not found.
 */
export async function getUserSettings(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') {
    return null;
  }

  if (error) {
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }

  return data;
}
