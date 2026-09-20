import type { Localized } from '../i18n.js';
import type { Level } from '../types.js';

export interface LevelCard {
  readonly level: Level;
  readonly title: Localized;
  readonly catchphrase: Localized;
  readonly image: string;
}

export const LEVELS: Readonly<Record<Level, LevelCard>> = {
  1: {
    level: 1,
    title: { ja: '研修生', en: 'Trainee' },
    catchphrase: { ja: '今日は Jev に任せましょう', en: 'Maybe leave it to Jev today' },
    image: '/img/levels/level_1.webp',
  },
  2: {
    level: 2,
    title: { ja: '新人検査官', en: 'Junior Officer' },
    catchphrase: { ja: 'まだ AI に代替される側', en: 'Still on the replaceable side' },
    image: '/img/levels/level_2.webp',
  },
  3: {
    level: 3,
    title: { ja: '一人前', en: 'Full Officer' },
    catchphrase: { ja: 'AI と互角まであと一歩', en: 'One step from matching the AI' },
    image: '/img/levels/level_3.webp',
  },
  4: {
    level: 4,
    title: { ja: 'ベテラン', en: 'Veteran' },
    catchphrase: { ja: 'AI に代替されない人間（認定）', en: 'Certified un-automatable' },
    image: '/img/levels/level_4.webp',
  },
  5: {
    level: 5,
    title: { ja: '伝説の検査官', en: 'Legendary Officer' },
    catchphrase: { ja: 'Jev の上司はあなたです', en: "You're Jev's supervisor now" },
    image: '/img/levels/level_5.webp',
  },
};

export const LEVEL_IMAGES: readonly string[] = Object.values(LEVELS).map((card) => card.image);
