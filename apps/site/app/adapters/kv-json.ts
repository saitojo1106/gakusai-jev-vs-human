import type { z } from 'zod';

export const parseOrNull = <T>(schema: z.ZodType<T>, raw: string | null): T | null => {
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
