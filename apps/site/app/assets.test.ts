import { LEVEL_IMAGES, PASSENGER_IMAGES } from '@game/domain';
import { describe, expect, it } from 'vitest';

const present = new Set(
  Object.keys(import.meta.glob('../public/img/**/*.png')).map((path) =>
    path.replace('../public', ''),
  ),
);

describe('画像アセット', () => {
  it('乗客イラストが一覧どおりに揃っている', () => {
    expect(PASSENGER_IMAGES.filter((path) => !present.has(path))).toEqual([]);
  });

  it('レベルカードが 5 枚揃っている', () => {
    expect(LEVEL_IMAGES.filter((path) => !present.has(path))).toEqual([]);
  });

  it('タイトルと検査場の背景がある', () => {
    for (const path of ['/img/bg/bg_title.png', '/img/bg/bg_checkpoint.png']) {
      expect(present.has(path)).toBe(true);
    }
  });
});
