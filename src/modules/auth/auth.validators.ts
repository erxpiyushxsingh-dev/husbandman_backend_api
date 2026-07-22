import { z } from "zod";

/**
 * Password policy: min 8 chars, at least one letter and one number.
 * Adjust to your org's policy, but keep it enforced server-side —
 * never trust frontend-only validation for security-relevant rules.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: passwordSchema,
  role: z.enum(["owner", "admin", "manager", "staff"]).optional().default("staff"),
  branch: z.string().trim().max(150).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
