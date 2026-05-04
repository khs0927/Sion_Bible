import type { SVGProps } from 'react';

type KawaiiIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function baseProps({ size = 24, ...props }: KawaiiIconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
    ...props,
  };
}

function Face() {
  return (
    <>
      <path d="M9.2 12.6c.55.68 1.05 1 1.55 1s1-.32 1.55-1" stroke="#5f4b46" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M7.2 10.1c.38.44.86.44 1.24 0M13.1 10.1c.38.44.86.44 1.24 0" stroke="#5f4b46" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="6.35" cy="12.3" r="1" fill="#f6a99f" opacity=".55" />
      <circle cx="15.25" cy="12.3" r="1" fill="#f6a99f" opacity=".55" />
    </>
  );
}

export function KawaiiHomeIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4.5 11.1 12 4.8l7.5 6.3v7.2c0 1.05-.85 1.9-1.9 1.9H6.4c-1.05 0-1.9-.85-1.9-1.9v-7.2Z" fill="#fff8ea" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.2 20.2v-5.1c0-.7.57-1.27 1.27-1.27h3.06c.7 0 1.27.57 1.27 1.27v5.1" fill="#f7c9b6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <Face />
    </svg>
  );
}

export function KawaiiBibleIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6.2 4.1h9.1c1.4 0 2.5 1.1 2.5 2.5v13.1H8.1a2.9 2.9 0 0 1-2.9-2.9V5.1c0-.55.45-1 1-1Z" fill="#fff8ea" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.1 16.1h9.7M8.1 19.7v-3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 7.5v5M9.8 10h4.4" stroke="#a6d9cf" strokeWidth="1.7" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiVerseIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7.8 17.8c-2.5 0-4.4-1.72-4.4-4.1 0-1.95 1.35-3.55 3.22-3.98.66-2.55 2.8-4.24 5.38-4.24 2.92 0 5.28 2.16 5.52 5.07 1.76.5 3.08 1.95 3.08 3.75 0 2.05-1.74 3.5-3.98 3.5H7.8Z" fill="#ffd0c8" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10.8 9.2 12 7.2l1.2 2 2.25.52-1.5 1.72.2 2.28L12 12.8l-2.15.92.2-2.28-1.5-1.72 2.25-.52Z" fill="#fff2b8" stroke="#d8a65f" strokeWidth="1.2" strokeLinejoin="round" />
      <Face />
    </svg>
  );
}

export function KawaiiJournalIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6.1 5.1h9.7c1.1 0 2 .9 2 2v11.1c0 .95-.78 1.72-1.72 1.72H6.1V5.1Z" fill="#fef5df" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6.1 5.1c0-1.05.85-1.9 1.9-1.9h8.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 15.7c2.35-.45 4.22-1.72 5.6-3.82" stroke="#a6d9cf" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.8 8.4c1.38-.2 2.7.3 3.62 1.38-1.02 1.2-2.42 1.75-3.9 1.48-.9-.15-1.65-.62-2.2-1.25.62-.87 1.45-1.46 2.48-1.61Z" fill="#b8dfd0" stroke="#6aa99b" strokeWidth="1.25" strokeLinejoin="round" />
      <Face />
    </svg>
  );
}

export function KawaiiSavedIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 20.2S4.7 16.4 4.7 9.95c0-2.55 1.85-4.35 4.2-4.35 1.35 0 2.48.67 3.1 1.72.62-1.05 1.75-1.72 3.1-1.72 2.35 0 4.2 1.8 4.2 4.35 0 6.45-7.3 10.25-7.3 10.25Z" fill="#ffc4bd" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <Face />
    </svg>
  );
}

export function KawaiiSettingsIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3.8v2M12 18.2v2M5.2 12h-2M20.8 12h-2M7.2 7.2 5.8 5.8M18.2 18.2l-1.4-1.4M16.8 7.2l1.4-1.4M5.8 18.2l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="5.4" fill="#ffe2a5" stroke="currentColor" strokeWidth="1.7" />
      <Face />
    </svg>
  );
}

export function KawaiiAudioIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="7" y="5.2" width="10" height="13.6" rx="3" fill="#fff0d9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="10.2" r="2.7" fill="#f5b9a6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 9.1c-1.1 1.62-1.1 4.18 0 5.8M19 9.1c1.1 1.62 1.1 4.18 0 5.8" stroke="#b59a73" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M10.35 15.4h3.3" stroke="#6aa99b" strokeWidth="1.5" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiShareIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4.2 13.1 18.9 5.2c.7-.38 1.48.32 1.18 1.06l-5.38 13.1c-.31.76-1.4.72-1.65-.06l-1.5-4.65-4.72-1.06c-.83-.18-1.06-1.08-.63-1.49Z" fill="#ffd0c8" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="m11.55 14.65 3.3-3.85" stroke="#fff8ea" strokeWidth="1.55" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiRandomIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3.9 14.2 8l4.55.82-3.15 3.36.62 4.58L12 14.78l-4.22 1.98.62-4.58-3.15-3.36L9.8 8 12 3.9Z" fill="#ffe2a5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="5.5" cy="17.6" r="1" fill="#f5b9a6" />
      <circle cx="18.6" cy="16.4" r="1.1" fill="#a9d9d7" />
      <Face />
    </svg>
  );
}

export function KawaiiMeditationIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="5.2" y="5.4" width="13.6" height="13.2" rx="3.2" fill="#fff1d9" stroke="currentColor" strokeWidth="1.65" />
      <path d="M8.8 9.2h6.2M8.8 12h5M8.8 14.8h3.8" stroke="#d3a46d" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M6.9 17.9c2-.22 3.65-.98 4.92-2.3" stroke="#6aa99b" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M17.3 4.2 18.2 6l1.95.35-1.35 1.45.27 1.96-1.77-.84-1.78.84.28-1.96-1.36-1.45L16.4 6l.9-1.8Z" fill="#ffe2a5" stroke="#d8a65f" strokeWidth="1.05" strokeLinejoin="round" />
      <Face />
    </svg>
  );
}

export function KawaiiApplicationIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5.2 5.8h11.2c1.1 0 2 .9 2 2v9.4c0 1.1-.9 2-2 2H7.2c-1.1 0-2-.9-2-2V5.8Z" fill="#fff3d8" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="m9 13.1 1.8 1.8 4.2-5" stroke="#e79c82" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.2 18.8c1.75-1.3 3.52-2.05 5.4-2.3" stroke="#6aa99b" strokeWidth="1.45" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiHopeIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4.5 15.6c2.1-3.2 4.6-4.8 7.5-4.8s5.4 1.6 7.5 4.8" fill="#b8dfd0" />
      <path d="M4.5 15.6c2.1-3.2 4.6-4.8 7.5-4.8s5.4 1.6 7.5 4.8" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M7.2 11.4c.7-2.8 2.5-4.5 4.8-4.5s4.1 1.7 4.8 4.5" fill="#ffe2a5" stroke="#d8a65f" strokeWidth="1.5" />
      <Face />
    </svg>
  );
}

export function KawaiiComfortIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7.8 18.1c-2.5 0-4.4-1.74-4.4-4.12 0-1.95 1.35-3.55 3.22-3.98.66-2.55 2.8-4.24 5.38-4.24 2.92 0 5.28 2.16 5.52 5.07 1.76.5 3.08 1.95 3.08 3.75 0 2.05-1.74 3.52-3.98 3.52H7.8Z" fill="#fff8ea" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 16.6s-3.1-1.65-3.1-4.05c0-1 .72-1.68 1.62-1.68.64 0 1.17.34 1.48.88.31-.54.84-.88 1.48-.88.9 0 1.62.68 1.62 1.68 0 2.4-3.1 4.05-3.1 4.05Z" fill="#ffc4bd" />
      <Face />
    </svg>
  );
}

export function KawaiiPeaceIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7.1 14.7c2.35-1.08 4.05-2.75 5.1-5.04 1.12 2.45 3.08 4.08 5.9 4.9-1.7 1.72-3.75 2.48-6.15 2.28-2.05-.16-3.68-.88-4.85-2.14Z" fill="#fff8ea" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M12.2 9.66c.38-2.38 1.6-3.92 3.68-4.62.16 2.72-.86 4.66-3.05 5.82" fill="#b8dfd0" stroke="#6aa99b" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M8.2 18.9h7.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiWisdomIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M8.1 14.8h7.8l-1 4H9.1l-1-4Z" fill="#f7c9b6" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M12 4.5c2.28 1.72 3.58 4.35 3.58 7.25H8.42c0-2.9 1.3-5.53 3.58-7.25Z" fill="#ffe2a5" stroke="#d8a65f" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M9 11.75h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiPrayerIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3.8c2.88 3.35 5.2 6.25 5.2 9.7 0 3.12-2.28 5.5-5.2 5.5s-5.2-2.38-5.2-5.5c0-3.45 2.32-6.35 5.2-9.7Z" fill="#ffe0a6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <Face />
    </svg>
  );
}

export function KawaiiCalendarIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="4.2" y="5.2" width="15.6" height="14.8" rx="3" fill="#fff8ea" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.7 9h14.6M8 3.8v3M16 3.8v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.1 13.2h5.8M9.1 16h3.7" stroke="#a6d9cf" strokeWidth="1.7" strokeLinecap="round" />
      <Face />
    </svg>
  );
}

export function KawaiiLibraryIcon(props: KawaiiIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5 17.8V6.2c0-.9.72-1.62 1.62-1.62h3.6v13.22H5Z" fill="#b8dfd0" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.22 17.8V4.58h3.56v13.22" fill="#ffd0c8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.78 17.8V4.58h3.6c.9 0 1.62.72 1.62 1.62v11.6h-5.22Z" fill="#ffe2a5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4.2 19.7h15.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <Face />
    </svg>
  );
}
