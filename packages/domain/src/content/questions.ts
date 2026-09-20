import { FOLLOW_UP_UNLOCKED_AFTER } from '../constants.js';
import type { QuestionId, TravelPurpose } from '../types.js';

export interface QuestionSpec {
  readonly id: QuestionId;
  readonly question: string;
  readonly unlockedAfter: number;
}

export const QUESTIONS: readonly QuestionSpec[] = [
  { id: 'purpose', question: '今回の渡航の目的は？', unlockedAfter: 0 },
  { id: 'occupation', question: 'お仕事は何をされていますか？', unlockedAfter: 0 },
  { id: 'bag_contents', question: '荷物の中身を教えてください。', unlockedAfter: 0 },
  { id: 'who_packed', question: '荷造りはどなたがされましたか？', unlockedAfter: 0 },
  { id: 'accommodation', question: '滞在先はどちらですか？', unlockedAfter: 0 },
  {
    id: 'follow_up',
    question: 'さきほどの回答と食い違う点があります。説明していただけますか？',
    unlockedAfter: FOLLOW_UP_UNLOCKED_AFTER,
  },
];

export const PURPOSE_LABELS: Readonly<Record<TravelPurpose['stated'], string>> = {
  tourism: '観光',
  business: '仕事',
  family: '家族に会うため',
  study: '留学',
  relocation: '引っ越し',
  other: '所用',
};

export const OCCUPATIONS: Readonly<Record<TravelPurpose['stated'], readonly string[]>> = {
  tourism: ['会社員', '自営業', '休職中'],
  business: ['営業職', 'エンジニア', '経営者'],
  family: ['会社員', 'パート勤務', '主婦・主夫'],
  study: ['大学生', '大学院生', '語学学校の生徒'],
  relocation: ['配管工', '電気工事士', '設備の保守'],
  other: ['無職', 'フリーランス', '非公開'],
};

export const ACCOMMODATIONS: readonly string[] = [
  '中央駅前のホテル',
  '友人の家',
  '親戚の家',
  '短期契約のアパート',
  '会社の手配した宿',
  'まだ決めていません',
];

export const PACKED_BY: readonly string[] = [
  '自分で詰めました',
  '家族に手伝ってもらいました',
  '同行者が詰めました',
  '知人から預かった荷物も入っています',
];
