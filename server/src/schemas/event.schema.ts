import { z } from 'zod';

export const eventSchema = z.object({
  rfidUser:   z.string().min(1),
  rfidBottle: z.string().min(1),
  weight:     z.number().positive(),
  event:      z.enum(['taken', 'returned']),
  deviceId:   z.string().optional(),
});