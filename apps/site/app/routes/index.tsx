import { createRoute } from 'honox/factory';
import { ui } from '../i18n.js';
import StartShift from '../islands/StartShift.js';

export default createRoute((c) => {
  const locale = c.get('locale');
  const t = ui(locale);

  return c.render(
    <main class="hero min-h-screen bg-[url('/img/bg/bg_title.webp')] bg-cover bg-center">
      <div class="hero-overlay bg-base-100/85" />
      <div class="hero-content text-center">
        <div class="max-w-xl">
          <StartShift locale={locale} />
          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span class="badge badge-outline badge-lg">{t.opponent}</span>
          </div>
          <div class="mt-4">
            <a class="link link-primary" href="/ranking">
              {t.seeRanking}
            </a>
          </div>
        </div>
      </div>
    </main>,
    { preloadImages: ['/img/bg/bg_title.webp'], locale, url: c.req.url },
  );
});
