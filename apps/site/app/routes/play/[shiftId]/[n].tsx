import { PASSENGERS_PER_SHIFT } from '@game/domain';
import { createRoute } from 'honox/factory';
import Checkpoint from '../../../islands/Checkpoint.js';

export default createRoute((c) => {
  const shiftId = c.req.param('shiftId') ?? '';
  const index = Number(c.req.param('n'));

  if (!Number.isInteger(index) || index < 0 || index >= PASSENGERS_PER_SHIFT) {
    return c.redirect('/');
  }

  return c.render(
    <main class="mx-auto max-w-[1280px] px-4 py-6">
      <Checkpoint shiftId={shiftId} index={index} />
    </main>,
    { title: `検査場 ${index + 1} 人目` },
  );
});
