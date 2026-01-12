import { z } from 'zod';

export const createCanvasSchema = z.object({
  name: z
    .string()
    .min(1, 'Canvas name is required')
    .max(100, 'Canvas name must be less than 100 characters')
    .optional()
    .default('Untitled Canvas'),
});

export const updateCanvasSchema = z.object({
  name: z
    .string()
    .min(1, 'Canvas name is required')
    .max(100, 'Canvas name must be less than 100 characters')
    .optional(),
  is_archived: z.boolean().optional(),
});

export const createPlanTreeSchema = z.object({
  canvas_id: z.string().uuid('Invalid canvas ID'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional()
    .default('New Main Goal'),
  generate_all_levels: z.boolean().optional().default(false),
});

export const updatePlanTreeSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
});

export type CreateCanvasInput = z.infer<typeof createCanvasSchema>;
export type UpdateCanvasInput = z.infer<typeof updateCanvasSchema>;
export type CreatePlanTreeInput = z.infer<typeof createPlanTreeSchema>;
export type UpdatePlanTreeInput = z.infer<typeof updatePlanTreeSchema>;
