import application from '@/assets/clay-icons/sam2/application.png';
import audio from '@/assets/clay-icons/sam2/audio.png';
import backup from '@/assets/clay-icons/sam2/backup.png';
import blessing from '@/assets/clay-icons/sam2/blessing.png';
import bookmark from '@/assets/clay-icons/sam2/bookmark.png';
import bookmarked from '@/assets/clay-icons/sam2/bookmarked.png';
import books from '@/assets/clay-icons/sam2/books.png';
import calendar from '@/assets/clay-icons/sam2/calendar.png';
import comfort from '@/assets/clay-icons/sam2/comfort.png';
import dark from '@/assets/clay-icons/sam2/dark.png';
import deleteIcon from '@/assets/clay-icons/sam2/delete.png';
import font from '@/assets/clay-icons/sam2/font.png';
import gratitude from '@/assets/clay-icons/sam2/gratitude.png';
import home from '@/assets/clay-icons/sam2/home.png';
import hope from '@/assets/clay-icons/sam2/hope.png';
import journal from '@/assets/clay-icons/sam2/journal.png';
import light from '@/assets/clay-icons/sam2/light.png';
import love from '@/assets/clay-icons/sam2/love.png';
import meditation from '@/assets/clay-icons/sam2/meditation.png';
import newTestament from '@/assets/clay-icons/sam2/new.png';
import newEntry from '@/assets/clay-icons/sam2/new_entry.png';
import next from '@/assets/clay-icons/sam2/next.png';
import old from '@/assets/clay-icons/sam2/old.png';
import peace from '@/assets/clay-icons/sam2/peace.png';
import prayer from '@/assets/clay-icons/sam2/prayer.png';
import prayerNote from '@/assets/clay-icons/sam2/prayer_note.png';
import prev from '@/assets/clay-icons/sam2/prev.png';
import random from '@/assets/clay-icons/sam2/random.png';
import read from '@/assets/clay-icons/sam2/read.png';
import refresh from '@/assets/clay-icons/sam2/refresh.png';
import saved from '@/assets/clay-icons/sam2/saved.png';
import search from '@/assets/clay-icons/sam2/search.png';
import settings from '@/assets/clay-icons/sam2/settings.png';
import share from '@/assets/clay-icons/sam2/share.png';
import strength from '@/assets/clay-icons/sam2/strength.png';
import testimony from '@/assets/clay-icons/sam2/testimony.png';
import verse from '@/assets/clay-icons/sam2/verse.png';
import wisdom from '@/assets/clay-icons/sam2/wisdom.png';

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
