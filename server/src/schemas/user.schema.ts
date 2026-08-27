import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),

  email: z.string().email().optional(),

  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),

  newPassword: z.string().min(6),
});

export const profileParamsSchema = z.object({
  id: z.string().min(1),
});

export type UpdateProfileInput =
  z.infer<typeof updateProfileSchema>;

export type ChangePasswordInput =
  z.infer<typeof changePasswordSchema>;

export type ProfileParamsInput =
  z.infer<typeof profileParamsSchema>;