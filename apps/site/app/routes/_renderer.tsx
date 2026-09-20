import { LOCALES, LOCALE_NAMES } from '@game/domain';
import type { Locale } from '@game/domain';
import { jsxRenderer } from 'hono/jsx-renderer';
import { Link, Script } from 'honox/server';
import { localeHref, ui } from '../i18n.js';

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: {
        title?: string;
        description?: string;
        image?: string;
        canonical?: string;
        preloadImages?: readonly string[];
        locale?: Locale;
        url?: string;
      },
    ): Response;
  }
}

const LocaleSwitch = ({ locale, url }: { locale: Locale; url: string }) => (
  <nav class="flex justify-end gap-1 px-4 pt-3 text-sm" aria-label="Language">
    {LOCALES.map((candidate) => (
      <a
        key={candidate}
        href={localeHref(url, candidate)}
        hrefLang={candidate}
        aria-current={candidate === locale ? 'true' : undefined}
        class={`btn btn-ghost btn-xs ${candidate === locale ? 'btn-active' : 'opacity-60'}`}
      >
        {LOCALE_NAMES[candidate]}
      </a>
    ))}
  </nav>
);

export default jsxRenderer(
  ({ children, title, description, image, canonical, preloadImages, locale, url }) => {
    const active = locale ?? 'ja';
    const t = ui(active);
    const pageTitle = title === undefined ? t.siteTitle : `${title} | ${t.siteTitle}`;
    const summary = description ?? t.siteDescription;

    return (
      <html lang={active}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{pageTitle}</title>
          <meta name="description" content={summary} />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={summary} />
          <meta property="og:locale" content={active === 'ja' ? 'ja_JP' : 'en_US'} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={summary} />
          {image === undefined ? null : (
            <>
              <meta property="og:image" content={image} />
              <meta name="twitter:image" content={image} />
            </>
          )}
          {canonical === undefined ? null : (
            <>
              <link rel="canonical" href={canonical} />
              <meta property="og:url" content={canonical} />
            </>
          )}
          {(preloadImages ?? []).map((href) => (
            <link rel="preload" as="image" href={href} key={href} />
          ))}
          <Link href="/app/style.css" rel="stylesheet" />
          <Script src="/app/client.ts" />
        </head>
        <body class="min-h-screen bg-base-100 text-base-content">
          {url === undefined ? null : <LocaleSwitch locale={active} url={url} />}
          {children}
        </body>
      </html>
    );
  },
);
