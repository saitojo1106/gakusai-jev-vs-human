import { createRoute } from 'honox/factory';
import JevDemo from '../islands/JevDemo.js';

export default createRoute((c) =>
  c.render(
    <main class="mx-auto max-w-3xl px-4 py-8">
      <h1 class="text-3xl font-bold">Jev だけの審査</h1>
      <p class="mt-2 mb-6 opacity-70">
        人間が 1 人に 1 分かける審査を、AI が何秒で終わらせるか。
      </p>
      <JevDemo />
      <div class="mt-8">
        <a class="link link-primary" href="/">
          タイトルに戻る
        </a>
      </div>
    </main>,
    { title: 'Jev だけの審査' },
  ),
);
