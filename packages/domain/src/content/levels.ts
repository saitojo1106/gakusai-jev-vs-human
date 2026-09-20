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
    image: 'level_1.png',
  },
  2: {
    level: 2,
    title: '新人検査官',
    catchphrase: 'まだ AI に代替される側',
    image: 'level_2.png',
  },
  3: {
    level: 3,
    title: '一人前',
    catchphrase: 'AI と互角まであと一歩',
    image: 'level_3.png',
  },
  4: {
    level: 4,
    title: 'ベテラン',
    catchphrase: 'AI に代替されない人間（認定）',
    image: 'level_4.png',
  },
  5: {
    level: 5,
    title: '伝説の検査官',
    catchphrase: 'Jev の上司はあなたです',
    image: 'level_5.png',
  },
};

export const LEVEL_IMAGES: readonly string[] = Object.values(LEVELS).map((card) => card.image);
