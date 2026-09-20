import type { Level } from '../types.js';

export interface LevelCard {
  readonly level: Level;
  readonly title: string;
  readonly catchphrase: string;
  readonly image: string;
}

export const LEVELS: Readonly<Record<Level, LevelCard>> = {
  1: {
    level: 1,
    title: '研修生',
    catchphrase: '今日は Jev に任せましょう',
    image: '/img/levels/level_1.webp',
  },
  2: {
    level: 2,
    title: '新人検査官',
    catchphrase: 'まだ AI に代替される側',
    image: '/img/levels/level_2.webp',
  },
  3: {
    level: 3,
    title: '一人前',
    catchphrase: 'AI と互角まであと一歩',
    image: '/img/levels/level_3.webp',
  },
  4: {
    level: 4,
    title: 'ベテラン',
    catchphrase: 'AI に代替されない人間（認定）',
    image: '/img/levels/level_4.webp',
  },
  5: {
    level: 5,
    title: '伝説の検査官',
    catchphrase: 'Jev の上司はあなたです',
    image: '/img/levels/level_5.webp',
  },
};

export const LEVEL_IMAGES: readonly string[] = Object.values(LEVELS).map((card) => card.image);
