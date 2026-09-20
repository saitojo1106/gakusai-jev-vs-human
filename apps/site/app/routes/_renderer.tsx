import { jsxRenderer } from 'hono/jsx-renderer';
import { Link, Script } from 'honox/server';

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: {
        title?: string;
        description?: string;
        image?: string;
        canonical?: string;
      },
    ): Response;
  }
}

export default jsxRenderer(({ children, title, description, image, canonical }) => {
  const pageTitle = title === undefined ? '保安検査 vs Jev' : `${title} | 保安検査 vs Jev`;
  const summary = description ?? '空港の保安検査官として乗客 10 人を審査し、AI 判定モデル Jev と勝負する。';

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle}</title>
        <meta name="description" content={summary} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={summary} />
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
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body>{children}</body>
    </html>
  );
});
