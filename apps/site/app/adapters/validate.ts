import type { z } from 'zod';

export const validateOrNull = <T>(schema: z.ZodType<T>, value: unknown): T | null => {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  console.error(
    'D1 の行がスキーマに合いませんでした',
    parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  );
  return null;
};

export const parseJsonOrNull = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('D1 の JSON 列を読めませんでした', error);
    return undefined;
  }
};
