import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(200);
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: emailSchema,
  password: passwordSchema,
  native_language: z.string().max(10).optional(),
  learning_goal: z.string().max(200).optional(),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Password is required') });

export const contentBlockSchema = z.object({ type: z.string(), data: z.record(z.any()).default({}) });

/* Uploaded file validation */
export const UPLOAD_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
export const UPLOAD_MIME_ALLOW: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'application/pdf': 'pdf',
  'text/vtt': 'vtt',
  'text/plain': 'txt',
};
