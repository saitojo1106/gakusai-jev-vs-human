import { createRoute } from 'honox/factory';
import StartShift from '../islands/StartShift.js';

export default createRoute((c) =>
  c.render(
    <main class="shell title-screen">
      <div>
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
