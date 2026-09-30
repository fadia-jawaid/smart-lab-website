import { z } from 'zod';

export const createBottleSchema = z.object({
  rfidTag: z.string().min(1).trim(),

  chemicalName: z.string().min(1).trim(),

  description: z.string().optional(),

  // Fixed to grams system-wide — the load cell hardware only ever measures
  // weight, so this is a literal, not a free-form string. (Note: this
  // schema isn't currently wired into routes/inventory.ts, which enforces
  // the same rule directly — see the comment there. Keeping this correct
  // too so it stays safe if it's ever hooked up as validation middleware.)
  unit: z.literal('g').default('g'),

  initialQty: z.number().positive(),

  // Physical/hardware ceiling (e.g. 92g). Optional — falls back to the
  // Prisma column default (92) when omitted.
  maxCapacity: z.number().positive().optional(),

  lowStockPct: z.number().min(1).max(99).default(20),

  location: z.string().optional(),

  supplier: z.string().optional(),
});

export const updateBottleSchema = z.object({
  chemicalName: z.string().min(1).optional(),

  description: z.string().optional(),

  unit: z.string().optional(),

  initialQty: z.number().positive().optional(),

  maxCapacity: z.number().positive().optional(),

  currentQty: z.number().min(0).optional(),

  lowStockPct: z.number().min(1).max(99).optional(),

  location: z.string().optional(),

  supplier: z.string().optional(),

  isActive: z.boolean().optional(),
});

export type CreateBottleInput = z.infer<typeof createBottleSchema>;
export type UpdateBottleInput = z.infer<typeof updateBottleSchema>;