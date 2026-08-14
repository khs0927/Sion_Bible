import type { CSSProperties } from 'react';

import anxiety from '@/assets/clay-icons/sam2/moods/anxiety.png';
import blessing from '@/assets/clay-icons/sam2/moods/blessing.png';
import comfort from '@/assets/clay-icons/sam2/moods/comfort.png';
import fear from '@/assets/clay-icons/sam2/moods/fear.png';
import forgiveness from '@/assets/clay-icons/sam2/moods/forgiveness.png';
import gratitude from '@/assets/clay-icons/sam2/moods/gratitude.png';
import hope from '@/assets/clay-icons/sam2/moods/hope.png';
import love from '@/assets/clay-icons/sam2/moods/love.png';
import peace from '@/assets/clay-icons/sam2/moods/peace.png';
import repentance from '@/assets/clay-icons/sam2/moods/repentance.png';
import strength from '@/assets/clay-icons/sam2/moods/strength.png';
import wisdom from '@/assets/clay-icons/sam2/moods/wisdom.png';

export type MoodIconLabel =
  | '평안'
  | '감사'
  | '불안'
  | '소망'
  | '회개'
  | '위로'
  | '사랑'
  | '용서'
  | '두려움'
  | '지혜'
  | '능력'
  | '축복';

const moodIconMap: Record<MoodIconLabel, string> = {
  평안: peace,
  감사: gratitude,
  불안: anxiety,
  소망: hope,
  회개: repentance,
  위로: comfort,
  사랑: love,
  용서: forgiveness,
  두려움: fear,
  지혜: wisdom,
  능력: strength,
  축복: blessing,
};

interface MoodIconProps {
  label: MoodIconLabel;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function MoodIcon({ label, size = 48, className, style }: MoodIconProps) {
  return (
    <img
      src={moodIconMap[label]}
      alt=""
      width={size}
      height={size}
      className={[className, `mood-icon-${label}`].filter(Boolean).join(' ')}
      loading="lazy"
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'contrast(1.08) saturate(1.08) drop-shadow(0 4px 7px rgba(87, 62, 42, 0.16))',
        ...style,
      }}
    />
  );
}
