import { z } from 'zod';

export const createBottleSchema = z.object({
  rfidTag: z.string().min(1).trim(),

  chemicalName: z.string().min(1).trim(),

  description: z.string().optional(),

  unit: z.string().default('ml'),

  initialQty: z.number().positive(),

  lowStockPct: z.number().min(1).max(99).default(20),

  location: z.string().optional(),

  supplier: z.string().optional(),
});

export const updateBottleSchema = z.object({
  chemicalName: z.string().min(1).optional(),

  description: z.string().optional(),

  unit: z.string().optional(),

  currentQty: z.number().min(0).optional(),

  lowStockPct: z.number().min(1).max(99).optional(),

  location: z.string().optional(),

  supplier: z.string().optional(),

  isActive: z.boolean().optional(),
});

export type CreateBottleInput = z.infer<typeof createBottleSchema>;
export type UpdateBottleInput = z.infer<typeof updateBottleSchema>;