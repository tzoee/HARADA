import { z } from 'zod';

export const nodeStatusSchema = z.enum(['done', 'in_progress', 'blocked']);

export const updateNodeSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .nullable()
    .optional(),
  status: nodeStatusSchema.optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .nullable()
    .optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)')
    .nullable()
    .optional(),
  reminder_timezone: z
    .string()
    .max(50, 'Timezone must be less than 50 characters')
    .nullable()
    .optional(),
});

export const expandNodeSchema = z.object({
  node_id: z.string().uuid('Invalid node ID'),
});

export const duplicateSubtreeSchema = z.object({
  node_id: z.string().uuid('Invalid node ID'),
  target_parent_id: z.string().uuid('Invalid target parent ID').optional(),
});

export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
export type ExpandNodeInput = z.infer<typeof expandNodeSchema>;
export type DuplicateSubtreeInput = z.infer<typeof duplicateSubtreeSchema>;
