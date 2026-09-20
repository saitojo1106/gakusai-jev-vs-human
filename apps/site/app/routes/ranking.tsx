import { createUsecases } from '@game/application';
import { LEVELS } from '@game/domain/display';
import { createRoute } from 'honox/factory';
import { createDeps } from '../deps.js';

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default createRoute(async (c) => {
  const usecases = createUsecases(createDeps(c.env as AppBindings, c.req.url));
  const airport = c.req.query('airport');
  const ranking = await usecases.getRanking(airport === undefined ? {} : { airport });

  return c.render(
    <main class="mx-auto max-w-3xl px-4 py-8">
      <h1 class="mb-6 text-3xl font-bold">ランキング</h1>

      <form method="get" class="mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          name="airport"
          maxLength={20}
          value={airport ?? ''}
          placeholder="空港名で絞り込む"
          class="input input-bordered grow"
        />
        <button type="submit" class="btn btn-primary">
          絞り込む
        </button>
        {airport === undefined ? null : (
          <a href="/ranking" class="btn btn-ghost">
            解除
          </a>
        )}
      </form>

      {ranking.length === 0 ? (
        <div class="alert">
          <span>まだ誰も検査を終えていません。</span>
        </div>
      ) : (
        <div class="overflow-x-auto rounded-box border border-base-300">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>順位</th>
                <th>空港名</th>
                <th>レベル</th>
                <th class="text-right">スコア</th>
                <th class="text-right">Jev との差</th>
                <th>日時</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, i) => (
                <tr key={entry.resultId}>
                  <td class="font-bold tabular-nums">{i + 1}</td>
                  <td class="font-medium">{entry.airport}</td>
                  <td>
                    <span class="badge badge-outline whitespace-nowrap">
                      Lv.{entry.level} {LEVELS[entry.level].title}
                    </span>
                  </td>
                  <td class="text-right tabular-nums">{entry.points}</td>
                  <td
                    class={`text-right tabular-nums ${entry.marginOverJev >= 0 ? 'text-success' : 'text-error'}`}
                  >
                    {entry.marginOverJev >= 0 ? '+' : ''}
                    {entry.marginOverJev}
                  </td>
                  <td class="whitespace-nowrap opacity-70">{formatDate(entry.finishedAt)}</td>
                  <td>
                    <a class="link link-primary" href={`/r/${entry.resultId}?from=ranking`}>
                      詳細
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div class="mt-8">
        <a class="link link-primary" href="/">
          タイトルに戻る
        </a>
      </div>
    </main>,
    { title: 'ランキング' },
  );
});
