import home from '@/assets/clay-icons/v2/home.png';
import read from '@/assets/clay-icons/v2/bible.png';
import verse from '@/assets/clay-icons/v2/scroll.png';
import journal from '@/assets/clay-icons/v2/journal.png';
import saved from '@/assets/clay-icons/v2/cloud_heart.png';
import prayer from '@/assets/clay-icons/v2/prayer.png';
import audio from '@/assets/clay-icons/v2/audio.png';
import share from '@/assets/clay-icons/v2/share.png';
import random from '@/assets/clay-icons/v2/wisdom.png'; // Using wisdom icon for random as it looks spiritual
import settings from '@/assets/clay-icons/v2/settings.png';

import newEntry from '@/assets/clay-icons/journal/new_entry.png';
import meditation from '@/assets/clay-icons/v2/meditation.png';
import calendar from '@/assets/clay-icons/v2/calendar.png';
import application from '@/assets/clay-icons/v2/check.png';
import testimony from '@/assets/clay-icons/journal/testimony.png';
import backup from '@/assets/clay-icons/journal/backup.png';
import deleteIcon from '@/assets/clay-icons/journal/delete.png';

import comfort from '@/assets/clay-icons/v2/cloud_heart.png';
import wisdom from '@/assets/clay-icons/v2/wisdom.png';
import love from '@/assets/clay-icons/v2/comfort.png';
import peace from '@/assets/clay-icons/category/peace.png';
import blessing from '@/assets/clay-icons/category/blessing.png';
import strength from '@/assets/clay-icons/category/strength.png';

import search from '@/assets/clay-icons/v2/search.png';
import books from '@/assets/clay-icons/reader/books.png';
import old from '@/assets/clay-icons/reader/old.png';
import newTestament from '@/assets/clay-icons/reader/new.png';
import prev from '@/assets/clay-icons/reader/prev.png';
import next from '@/assets/clay-icons/reader/next.png';
import bookmark from '@/assets/clay-icons/reader/bookmark.png';
import bookmarked from '@/assets/clay-icons/reader/bookmarked.png';
import font from '@/assets/clay-icons/reader/font.png';
import light from '@/assets/clay-icons/reader/light.png';
import dark from '@/assets/clay-icons/reader/dark.png';
import refresh from '@/assets/clay-icons/v2/refresh.png';

export const clayIconMap = {
  home,
  read,
  verse,
  journal,
  saved,
  prayer,
  audio,
  share,
  random,
  settings,
  new_entry: newEntry,
  meditation,
  prayer_note: prayer,
  application,
  calendar,
  testimony,
  backup,
  delete: deleteIcon,
  comfort,
  hope: wisdom,
  gratitude: comfort,
  love,
  wisdom,
  peace,
  blessing,
  strength,
  search,
  books,
  old,
  new: newTestament,
  prev,
  next,
  bookmark,
  bookmarked,
  font,
  light,
  dark,
  refresh,
} as const;

export type ClayIconName = keyof typeof clayIconMap;
