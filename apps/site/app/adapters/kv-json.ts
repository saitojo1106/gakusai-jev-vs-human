import type { z } from 'zod';

export const parseOrNull = <T>(schema: z.ZodType<T>, raw: string | null): T | null => {
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    console.error(
      'KV の値がスキーマに合いませんでした',
      parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
    return null;
  } catch (error) {
    console.error('KV の値を JSON として読めませんでした', error);
    return null;
  }
};
