import type { CSSProperties } from 'react';
import { ClayIcon } from './ClayIcon';
import type { ClayIconName } from './clayIconMap';

type KawaiiIconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

function clay(name: ClayIconName, props: KawaiiIconProps) {
  const visualSize = Math.round((props.size ?? 24) * 1.82);
  return <ClayIcon name={name} size={visualSize} className={props.className} style={props.style} alt={props.title ?? ''} framed />;
}

export function KawaiiHomeIcon(props: KawaiiIconProps) {
  return clay('home', props);
}

export function KawaiiBibleIcon(props: KawaiiIconProps) {
  return clay('read', props);
}

export function KawaiiVerseIcon(props: KawaiiIconProps) {
  return clay('verse', props);
}

export function KawaiiJournalIcon(props: KawaiiIconProps) {
  return clay('journal', props);
}

export function KawaiiSavedIcon(props: KawaiiIconProps) {
  return clay('saved', props);
}

export function KawaiiSettingsIcon(props: KawaiiIconProps) {
  return clay('settings', props);
}

export function KawaiiAudioIcon(props: KawaiiIconProps) {
  return clay('audio', props);
}

export function KawaiiShareIcon(props: KawaiiIconProps) {
  return clay('share', props);
}

export function KawaiiRandomIcon(props: KawaiiIconProps) {
  return clay('random', props);
}

export function KawaiiMeditationIcon(props: KawaiiIconProps) {
  return clay('meditation', props);
}

export function KawaiiApplicationIcon(props: KawaiiIconProps) {
  return clay('application', props);
}

export function KawaiiHopeIcon(props: KawaiiIconProps) {
  return clay('hope', props);
}

export function KawaiiComfortIcon(props: KawaiiIconProps) {
  return clay('comfort', props);
}

export function KawaiiPeaceIcon(props: KawaiiIconProps) {
  return clay('peace', props);
}

export function KawaiiWisdomIcon(props: KawaiiIconProps) {
  return clay('wisdom', props);
}

export function KawaiiPrayerIcon(props: KawaiiIconProps) {
  return clay('prayer', props);
}

export function KawaiiCalendarIcon(props: KawaiiIconProps) {
  return clay('calendar', props);
}

export function KawaiiLibraryIcon(props: KawaiiIconProps) {
  return clay('books', props);
}
