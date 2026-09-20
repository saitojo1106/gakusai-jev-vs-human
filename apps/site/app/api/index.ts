import { AppError, createUsecases, isAppError } from '@game/application';
import type { AppErrorCode, UsecaseDeps } from '@game/application';
import {
  startShiftRequestSchema,
  submitVerdictRequestSchema,
  rankingQuerySchema,
} from '@game/contracts';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const STATUS: Readonly<Record<AppErrorCode, ContentfulStatusCode>> = {
  invalid_airport: 400,
  airport_too_long: 400,
  shift_not_found: 404,
  passenger_not_found: 404,
  already_decided: 409,
  shift_incomplete: 409,
  result_not_found: 404,
  rate_limited: 429,
};

const jsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

const passengerIndex = (raw: string): number => {
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
};

export const createApi = (deps: UsecaseDeps) => {
  const usecases = createUsecases(deps);

  return new Hono()
    .basePath('/api')
    .onError((error, c) => {
      if (isAppError(error)) {
        return c.json({ error: error.code, message: error.message }, STATUS[error.code]);
      }
      console.error(error);
      return c.json({ error: 'internal', message: 'unexpected error' }, 500);
    })
    .post('/shift', async (c) => {
      const parsed = startShiftRequestSchema.safeParse(await jsonBody(c.req.raw));
      if (!parsed.success) {
        return c.json({ error: 'invalid_airport', message: 'airport name is required' }, 400);
      }
      return c.json(await usecases.startShift(parsed.data));
    })
    .get('/shift/:id/passenger/:n', async (c) => {
      const response = await usecases.servePassenger({
        shiftId: c.req.param('id'),
        index: passengerIndex(c.req.param('n')),
      });
      return c.json(response);
    })
    .post('/shift/:id/passenger/:n/verdict', async (c) => {
      const parsed = submitVerdictRequestSchema.safeParse(await jsonBody(c.req.raw));
      if (!parsed.success) {
        return c.json({ error: 'invalid_verdict', message: 'verdict payload is invalid' }, 400);
      }
      const outcome = await usecases.submitVerdict({
        shiftId: c.req.param('id'),
        index: passengerIndex(c.req.param('n')),
        decision: parsed.data,
      });
      return c.json(outcome.reveal, outcome.kind === 'already' ? 409 : 200);
    })
    .post('/shift/:id/finish', async (c) =>
      c.json(await usecases.finishShift({ shiftId: c.req.param('id') })),
    )
    .get('/result/:id', async (c) =>
      c.json(await usecases.getResult({ resultId: c.req.param('id') })),
    )
    .get('/ranking', async (c) => {
      const query = rankingQuerySchema.safeParse({
        ...(c.req.query('airport') === undefined ? {} : { airport: c.req.query('airport') }),
      });
      const limit = Number(c.req.query('limit'));
      return c.json(
        await usecases.getRanking({
          ...(query.success && query.data.airport !== undefined
            ? { airport: query.data.airport }
            : {}),
          ...(Number.isInteger(limit) ? { limit } : {}),
        }),
      );
    });
};

export type ApiType = ReturnType<typeof createApi>;

export { AppError };
