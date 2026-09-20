import { FOLLOW_UP_UNLOCKED_AFTER } from '../constants.js';
import type { Localized } from '../i18n.js';
import type { QuestionId, TravelPurpose } from '../types.js';

export interface QuestionSpec {
  readonly id: QuestionId;
  readonly question: Localized;
  readonly unlockedAfter: number;
}

export const QUESTIONS: readonly QuestionSpec[] = [
  {
    id: 'purpose',
    question: { ja: '今回の渡航の目的は？', en: 'What brings you here today?' },
    unlockedAfter: 0,
  },
  {
    id: 'occupation',
    question: { ja: 'お仕事は何をされていますか？', en: 'What do you do for a living?' },
    unlockedAfter: 0,
  },
  {
    id: 'bag_contents',
    question: { ja: '荷物の中身を教えてください。', en: "Tell me what's in your bag." },
    unlockedAfter: 0,
  },
  {
    id: 'who_packed',
    question: { ja: '荷造りはどなたがされましたか？', en: 'Who packed your bag?' },
    unlockedAfter: 0,
  },
  {
    id: 'accommodation',
    question: { ja: '滞在先はどちらですか？', en: 'Where will you be staying?' },
    unlockedAfter: 0,
  },
  {
    id: 'follow_up',
    question: {
      ja: 'さきほどの回答と食い違う点があります。説明していただけますか？',
      en: "That doesn't line up with what you said earlier. Care to explain?",
    },
    unlockedAfter: FOLLOW_UP_UNLOCKED_AFTER,
  },
];

export const PURPOSE_LABELS: Readonly<Record<TravelPurpose['stated'], Localized>> = {
  tourism: { ja: '観光', en: 'Tourism' },
  business: { ja: '仕事', en: 'Business' },
  family: { ja: '家族に会うため', en: 'Visiting family' },
  study: { ja: '留学', en: 'Study' },
  relocation: { ja: '引っ越し', en: 'Relocation' },
  other: { ja: '所用', en: 'Personal matters' },
};

export const OCCUPATIONS: Readonly<Record<TravelPurpose['stated'], readonly Localized[]>> = {
  tourism: [
    { ja: '会社員', en: 'Office worker' },
    { ja: '自営業', en: 'Self-employed' },
    { ja: '休職中', en: 'On leave' },
  ],
  business: [
    { ja: '営業職', en: 'Sales' },
    { ja: 'エンジニア', en: 'Engineer' },
    { ja: '経営者', en: 'Company director' },
  ],
  family: [
    { ja: '会社員', en: 'Office worker' },
    { ja: 'パート勤務', en: 'Part-time worker' },
    { ja: '主婦・主夫', en: 'Homemaker' },
  ],
  study: [
    { ja: '大学生', en: 'University student' },
    { ja: '大学院生', en: 'Graduate student' },
    { ja: '語学学校の生徒', en: 'Language school student' },
  ],
  relocation: [
    { ja: '配管工', en: 'Plumber' },
    { ja: '電気工事士', en: 'Electrician' },
    { ja: '設備の保守', en: 'Facilities maintenance' },
  ],
  other: [
    { ja: '無職', en: 'Unemployed' },
    { ja: 'フリーランス', en: 'Freelance' },
    { ja: '非公開', en: 'Prefer not to say' },
  ],
};

export const UNDECIDED_ACCOMMODATION: Localized = {
  ja: 'まだ決めていません',
  en: "I haven't decided yet",
};

export const ACCOMMODATIONS: readonly Localized[] = [
  { ja: '中央駅前のホテル', en: 'A hotel by the central station' },
  { ja: '友人の家', en: "A friend's place" },
  { ja: '親戚の家', en: "A relative's place" },
  { ja: '短期契約のアパート', en: 'A short-term rental flat' },
  { ja: '会社の手配した宿', en: 'Lodging arranged by my company' },
  UNDECIDED_ACCOMMODATION,
];

export const PACKED_BY: readonly Localized[] = [
  { ja: '自分で詰めました', en: 'I packed it myself' },
  { ja: '家族に手伝ってもらいました', en: 'My family helped me pack' },
  { ja: '同行者が詰めました', en: 'My travel companion packed it' },
  { ja: '知人から預かった荷物も入っています', en: "Some of it was handed to me by an acquaintance" },
];
