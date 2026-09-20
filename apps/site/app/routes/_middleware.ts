import type { Locale } from '@game/domain';
import { createRoute } from 'honox/factory';
import { LOCALE_COOKIE, LOCALE_QUERY, resolveLocale } from '../i18n.js';

declare module 'hono' {
  interface ContextVariableMap {
    locale: Locale;
  }
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export default createRoute(async (c, next) => {
  const locale = resolveLocale({
    query: c.req.query(LOCALE_QUERY),
    cookie: c.req.header('Cookie'),
    acceptLanguage: c.req.header('Accept-Language'),
  });
  c.set('locale', locale);

  await next();

  // 明示的に選ばれたときだけ覚える。自動判定は毎回やり直す。
  if (c.req.query(LOCALE_QUERY) !== undefined) {
    c.header(
      'Set-Cookie',
      `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
      { append: true },
    );
  }
});
