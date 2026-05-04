import home from '@/assets/clay-icons/main/home.png';
import read from '@/assets/clay-icons/main/read.png';
import verse from '@/assets/clay-icons/main/verse.png';
import journal from '@/assets/clay-icons/main/journal.png';
import saved from '@/assets/clay-icons/main/saved.png';
import prayer from '@/assets/clay-icons/main/prayer.png';
import audio from '@/assets/clay-icons/main/audio.png';
import share from '@/assets/clay-icons/main/share.png';
import random from '@/assets/clay-icons/main/random.png';
import settings from '@/assets/clay-icons/main/settings.png';

import newEntry from '@/assets/clay-icons/journal/new_entry.png';
import meditation from '@/assets/clay-icons/journal/meditation.png';
import prayerNote from '@/assets/clay-icons/journal/prayer_note.png';
import application from '@/assets/clay-icons/journal/application.png';
import calendar from '@/assets/clay-icons/journal/calendar.png';
import testimony from '@/assets/clay-icons/journal/testimony.png';
import backup from '@/assets/clay-icons/journal/backup.png';
import deleteIcon from '@/assets/clay-icons/journal/delete.png';

import comfort from '@/assets/clay-icons/category/comfort.png';
import hope from '@/assets/clay-icons/category/hope.png';
import gratitude from '@/assets/clay-icons/category/gratitude.png';
import love from '@/assets/clay-icons/category/love.png';
import wisdom from '@/assets/clay-icons/category/wisdom.png';
import peace from '@/assets/clay-icons/category/peace.png';
import blessing from '@/assets/clay-icons/category/blessing.png';
import strength from '@/assets/clay-icons/category/strength.png';

import search from '@/assets/clay-icons/reader/search.png';
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
import refresh from '@/assets/clay-icons/reader/refresh.png';

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
  prayer_note: prayerNote,
  application,
  calendar,
  testimony,
  backup,
  delete: deleteIcon,
  comfort,
  hope,
  gratitude,
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
