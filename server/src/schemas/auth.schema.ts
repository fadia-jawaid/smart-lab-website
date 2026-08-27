import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const labInchargeLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const studentLoginSchema = z.object({
  rollNo: z.string().min(1),
  password: z.string().min(6),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type LabInchargeLoginInput = z.infer<typeof labInchargeLoginSchema>;
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;