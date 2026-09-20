import { createRoute } from 'honox/factory';
import JevDemo from '../islands/JevDemo.js';

export default createRoute((c) =>
  c.render(
    <main class="shell narrow">
      <h1>Jev だけで 100 人</h1>
      <p class="lede">人間が 1 人に 1 分かける審査を、AI が何秒で終わらせるか。</p>
      <JevDemo />
      <p>
        <a href="/">タイトルに戻る</a>
      </p>
    </main>,
    { title: 'Jev だけで 100 人' },
  ),
);
