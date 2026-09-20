import type { ApiError } from '@game/contracts';

export type AppErrorCode = ApiError['error'];

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
