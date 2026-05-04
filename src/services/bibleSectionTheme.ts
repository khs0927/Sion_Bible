export interface SectionTheme {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
}

export const BIBLE_SECTION_THEMES: Record<string, SectionTheme> = {
  // Old Testament
  pentateuch: {
    bg: '#FFF1D9',
    border: '#F2D19B',
    text: '#7A5A1A',
    badgeBg: '#F2D19B',
    badgeText: '#FFFFFF',
  },
  history: {
    bg: '#FDE7D9',
    border: '#F3C2A7',
    text: '#7A4323',
    badgeBg: '#F3C2A7',
    badgeText: '#FFFFFF',
  },
  poetry: {
    bg: '#EAE7FF',
    border: '#C9C1FF',
    text: '#5A50A3',
    badgeBg: '#C9C1FF',
    badgeText: '#FFFFFF',
  },
  major_prophets: {
    bg: '#E3F2E7',
    border: '#B9DDBF',
    text: '#3D6A43',
    badgeBg: '#B9DDBF',
    badgeText: '#FFFFFF',
  },
  minor_prophets: {
    bg: '#FBE4EC',
    border: '#F2BED0',
    text: '#8A4760',
    badgeBg: '#F2BED0',
    badgeText: '#FFFFFF',
  },
  // New Testament
  gospels: {
    bg: '#FFF4CC',
    border: '#EFD98F',
    text: '#7B651E',
    badgeBg: '#EFD98F',
    badgeText: '#FFFFFF',
  },
  nt_history: {
    bg: '#DFF2F1',
    border: '#A9DAD7',
    text: '#2F6A68',
    badgeBg: '#A9DAD7',
    badgeText: '#FFFFFF',
  },
  paul_epistles: {
    bg: '#E8EAFD',
    border: '#C3CAF7',
    text: '#4A56A6',
    badgeBg: '#C3CAF7',
    badgeText: '#FFFFFF',
  },
  general_epistles: {
    bg: '#F6E4FF',
    border: '#DBB8F0',
    text: '#7C4D96',
    badgeBg: '#DBB8F0',
    badgeText: '#FFFFFF',
  },
  prophecy: {
    bg: '#FFE7E0',
    border: '#F3B9AC',
    text: '#8B4A3A',
    badgeBg: '#F3B9AC',
    badgeText: '#FFFFFF',
  },
};

export function getSectionTheme(section: string): SectionTheme {
  return BIBLE_SECTION_THEMES[section] || {
    bg: '#FDF6F0',
    border: '#E8D8CE',
    text: '#3D3129',
    badgeBg: '#E8D8CE',
    badgeText: '#FFFFFF',
  };
}

export const TESTAMENT_THEMES = {
  old: {
    accent: '#A48EF5',
    bg: '#F0EBFF',
    text: '#8F84E8',
    border: '#D5CCFF',
  },
  new: {
    accent: '#7FB6A8',
    bg: '#E8F6F1',
    text: '#5A9885',
    border: '#BFE2D4',
  },
  all: {
    accent: '#8d95d8',
    bg: '#f3f4f6',
    text: '#6b7280',
    border: '#e5e7eb',
  }
};
