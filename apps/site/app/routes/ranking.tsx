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
    <main class="shell narrow">
      <h1>ランキング</h1>
      <form method="get" class="field">
        <input
          type="text"
          name="airport"
          maxLength={20}
          value={airport ?? ''}
          placeholder="空港名で絞り込む"
        />
        <button type="submit">絞り込む</button>
        {airport === undefined ? null : (
          <a href="/ranking">
            <button type="button">解除</button>
          </a>
        )}
      </form>

      {ranking.length === 0 ? (
        <p class="muted">まだ誰も検査を終えていません。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>空港名</th>
              <th>レベル</th>
              <th>スコア</th>
              <th>Jev との差</th>
              <th>日時</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry, i) => (
              <tr key={entry.resultId}>
                <td>{i + 1}</td>
                <td>{entry.airport}</td>
                <td>
                  Lv.{entry.level} {LEVELS[entry.level].title}
                </td>
                <td>{entry.points}</td>
                <td class={entry.marginOverJev >= 0 ? 'mark-ok' : 'mark-ng'}>
                  {entry.marginOverJev >= 0 ? '+' : ''}
                  {entry.marginOverJev}
                </td>
                <td>{formatDate(entry.finishedAt)}</td>
                <td>
                  <a href={`/r/${entry.resultId}`}>詳細</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p>
        <a href="/">タイトルに戻る</a>
      </p>
    </main>,
    { title: 'ランキング' },
  );
});
