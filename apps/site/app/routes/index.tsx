import { createRoute } from 'honox/factory';
import StartShift from '../islands/StartShift.js';

export default createRoute((c) =>
  c.render(
    <main class="shell title-screen">
      <div>
        <h1>保安検査 vs Jev</h1>
        <p class="lede">
          乗客 10 人を審査して、AI 判定モデル Jev とスコアを競う。
          <br />
          脅威を通過させればハイジャック、無害な人を拘束すれば苦情。
        </p>
        <StartShift />
        <p style="margin-top:2rem">
          <span class="badge">対戦相手: Jev（TypeSafe AI）</span>
        </p>
        <p>
          <a href="/ranking">ランキングを見る</a>
        </p>
      </div>
    </main>,
  ),
);
