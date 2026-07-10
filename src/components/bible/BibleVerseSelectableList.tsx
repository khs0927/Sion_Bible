import { Bookmark, Check, Copy } from 'lucide-react';
import { sanitizeScriptureText } from '../../utils/textUtils';

interface Verse {
  verse: number;
  text: string;
}

interface BibleVerseSelectableListProps {
  verses: Verse[];
  selectedVerses: number[];
  onToggleVerse: (verseNumber: number) => void;
  mode: 'read' | 'select';
  onVerseClick: (verse: Verse) => void;
  fontSize: string;
  onToggleSave?: (verse: Verse) => void;
  isSaved?: (verseNumber: number) => boolean;
  onCopy?: (verse: Verse) => void;
  selectionMode?: boolean;
}

export function BibleVerseSelectableList({
  verses,
  selectedVerses,
  onToggleVerse,
  mode,
  onVerseClick,
  fontSize,
  onToggleSave,
  isSaved,
  onCopy,
  selectionMode = false,
}: BibleVerseSelectableListProps) {
  if (verses.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#E8D8C8] bg-white px-5 py-10 text-center text-sm font-bold text-[#8C786E]">
        이 장에 표시할 말씀이 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#EFE5DA] overflow-hidden rounded-[22px] border border-[#E8D8C8] bg-white shadow-sm">
      {verses.map((verse) => {
        const selected = selectedVerses.includes(verse.verse);
        const showCheckbox = mode === 'select' || selectionMode;
        const saved = isSaved?.(verse.verse) ?? false;

        return (
          <div
            key={verse.verse}
            id={`verse-${verse.verse}`}
            className={[
              'relative w-full px-4 py-3.5 text-left transition-all',
              selected && showCheckbox
                ? 'bg-[#6F8F72]/15 ring-2 ring-inset ring-[#6F8F72]/55'
                : 'bg-white hover:bg-[#FFF8F1]',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex w-8 shrink-0 flex-col items-center">
                {showCheckbox ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className={[
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-md text-[10px] font-black leading-none transition-colors',
                      selected ? 'bg-[#6F8F72] text-white' : 'bg-[#F7EFE7] text-[#8C6F55]',
                    ].join(' ')}>
                      {verse.verse}
                    </span>
                    <button
                      type="button"
                      aria-label={`${verse.verse}절 선택`}
                      aria-pressed={selected}
                      onClick={() => onToggleVerse(verse.verse)}
                      className={[
                        'inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 shadow-sm transition-all',
                        selected
                          ? 'border-[#6F8F72] bg-[#6F8F72] text-white shadow-[#6F8F72]/20'
                          : 'border-[#D9CBBE] bg-white text-transparent',
                      ].join(' ')}
                    >
                      <Check size={17} strokeWidth={4} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`${verse.verse}절 ${saved ? '저장 취소' : '저장'}`}
                    aria-pressed={saved}
                    onClick={() => onToggleSave?.(verse)}
                    disabled={!onToggleSave}
                    className="group flex flex-col items-center gap-1.5 outline-none disabled:cursor-default"
                  >
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F7EFE7] text-[10px] font-black leading-none text-[#8C6F55] transition-colors group-hover:bg-[#EAD8C4]">
                      {verse.verse}
                    </span>
                    <Bookmark
                      size={18}
                      fill={saved ? '#6F8F72' : 'transparent'}
                      stroke={saved ? '#6F8F72' : '#D4C4B5'}
                      strokeWidth={2.2}
                      className="transition-all duration-200"
                    />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (showCheckbox) onToggleVerse(verse.verse);
                  else onVerseClick(verse);
                }}
                className="serif-verse min-w-0 flex-1 bg-transparent p-0 text-left leading-[1.72] text-[#3D3129]"
                style={{ fontSize, whiteSpace: 'pre-wrap' }}
              >
                {sanitizeScriptureText(verse.text)}
              </button>

              {onCopy && (
                <button
                  type="button"
                  aria-label={`${verse.verse}절 복사`}
                  onClick={() => onCopy(verse)}
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E8D8C8] bg-[#FFFDF8] text-[#7B6A5D] shadow-sm transition active:scale-90"
                >
                  <Copy size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
