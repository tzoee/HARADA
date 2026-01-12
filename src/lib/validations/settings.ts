import { z } from 'zod';

export const languageSchema = z.enum(['en', 'id']);
export const themeSchema = z.enum(['dark', 'light']);
export const reminderPreferenceSchema = z.enum(['off', 'daily_summary', 'due_only']);

export const updateUserSettingsSchema = z.object({
  language: languageSchema.optional(),
  theme: themeSchema.optional(),
  reminder_pref: reminderPreferenceSchema.optional(),
  timezone: z
    .string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
