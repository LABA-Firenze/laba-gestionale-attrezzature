import { z } from '../middleware/validate.js';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email richiesta')
  .max(254, 'Email troppo lunga')
  .email('Formato email non valido');

const passwordSchema = z
  .string()
  .min(8, 'Password troppo corta')
  .max(128, 'Password troppo lunga');

export const loginBodySchema = z.object({
  email: z.string().trim().min(1, 'Email richiesta'),
  password: z.string().min(1, 'Password richiesta'),
});

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Nome richiesto').max(100, 'Nome troppo lungo'),
  surname: z.string().trim().min(1, 'Cognome richiesto').max(100, 'Cognome troppo lungo'),
  phone: z.string().trim().max(50, 'Telefono troppo lungo').optional().nullable(),
  matricola: z.string().trim().max(50, 'Matricola troppo lunga').optional().nullable(),
  corso_accademico: z.string().trim().max(255, 'Corso troppo lungo').optional().nullable(),
  ruolo: z.string().trim().max(50, 'Ruolo troppo lungo').optional().nullable(),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().trim().min(1, 'Token richiesto').max(512, 'Token troppo lungo'),
  password: passwordSchema,
});

export const adminResetPasswordBodySchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

export const emailParamSchema = z.object({
  email: z.string().trim().min(1, 'Email parametro richiesta').max(254, 'Email parametro troppo lunga'),
});
