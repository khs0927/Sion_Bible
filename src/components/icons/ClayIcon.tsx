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

export function ClayIcon({
  name,
  size = 40,
  alt = '',
  className,
  style,
  framed = true,
}: ClayIconProps) {
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
          overflow: 'visible',
          background: 'transparent',
          boxShadow: 'none',
          position: 'relative',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <img
          src={clayIconMap[name]}
          alt={alt}
          width={Math.round(size * 1.18)}
          height={Math.round(size * 1.18)}
          loading="lazy"
          draggable={false}
          style={{
            width: '118%',
            height: '118%',
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'none',
            transform: 'translateY(-2%)',
            filter: 'contrast(1.14) saturate(1.16) brightness(0.98) drop-shadow(0 4px 6px rgba(94, 62, 43, 0.2))',
            zIndex: 2,
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
