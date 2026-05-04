import type { CSSProperties } from 'react';
import { clayIconMap, type ClayIconName } from './clayIconMap';

interface ClayIconProps {
  name: ClayIconName;
  size?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  framed?: boolean;
}

const iconBorderMap: Partial<Record<ClayIconName, string>> = {
  home: '#e8aa78',
  read: '#d7b990',
  verse: '#edb37f',
  journal: '#ec9f83',
  saved: '#b6bd8f',
  prayer: '#eaa56f',
  audio: '#d9ad7c',
  share: '#e6a993',
  random: '#efbd67',
  settings: '#e1ad63',
  meditation: '#dfb684',
  prayer_note: '#e3a17d',
  application: '#d7bf91',
  calendar: '#e3a970',
  delete: '#e99478',
  comfort: '#e2bb94',
  hope: '#e7bd6b',
  gratitude: '#e6a665',
  love: '#eb9279',
  wisdom: '#d9a86f',
  peace: '#bac19a',
  blessing: '#bdc292',
  strength: '#d59e5f',
  bookmark: '#aab48b',
  bookmarked: '#e78e6c',
  search: '#ea9b73',
  books: '#d5a375',
  old: '#d2b486',
  new: '#df9d76',
  prev: '#d1ae7b',
  next: '#d1ae7b',
  font: '#d5bb8e',
  light: '#edbf66',
  dark: '#d2bb8f',
  refresh: '#b2bb91',
};

export function ClayIcon({
  name,
  size = 40,
  alt = '',
  className,
  style,
  framed = true,
}: ClayIconProps) {
  const borderColor = iconBorderMap[name] ?? '#e3c7aa';

  if (framed) {
    return (
      <span
        className={className}
        aria-hidden={alt ? undefined : true}
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          overflow: 'hidden',
          borderRadius: Math.max(10, Math.round(size * 0.24)),
          border: `1.5px solid ${borderColor}`,
          background: 'linear-gradient(145deg, #fff9ef 0%, #fff1e4 100%)',
          boxShadow: '0 8px 15px rgba(125, 86, 58, 0.2), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 2px rgba(160, 103, 64, 0.08)',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <img
          src={clayIconMap[name]}
          alt={alt}
          width={Math.round(size * 1.05)}
          height={Math.round(size * 1.05)}
          loading="lazy"
          draggable={false}
          style={{
            width: '105%',
            height: '105%',
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'none',
            transform: 'translateY(-1%) scale(1.18)',
            filter: 'contrast(1.34) saturate(1.38) brightness(0.94) drop-shadow(0 3px 4px rgba(94, 62, 43, 0.3))',
          }}
        />
      </span>
    );
  }

  return (
    <img
      src={clayIconMap[name]}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'contrast(1.18) saturate(1.24) brightness(0.97) drop-shadow(0 3px 4px rgba(107, 76, 54, 0.24))',
        ...style,
      }}
    />
  );
}
