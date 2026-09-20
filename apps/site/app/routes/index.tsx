import { createRoute } from 'honox/factory';
import StartShift from '../islands/StartShift.js';

export default createRoute((c) =>
  c.render(
    <main class="hero min-h-screen bg-[url('/img/bg/bg_title.webp')] bg-cover bg-center">
      <div class="hero-overlay bg-base-100/85" />
      <div class="hero-content text-center">
        <div class="max-w-xl">
          <StartShift />
          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span class="badge badge-outline badge-lg">対戦相手: Jev（TypeSafe AI）</span>
          </div>
          <div class="mt-4">
            <a class="link link-primary" href="/ranking">
              ランキングを見る
            </a>
          </div>
        </div>
      </div>
    </main>,
    { preloadImages: ['/img/bg/bg_title.webp'] },
  ),
);
