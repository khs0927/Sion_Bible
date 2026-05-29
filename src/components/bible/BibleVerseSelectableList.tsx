import { Check, Bookmark } from 'lucide-react';
import { sanitizeScriptureText } from '../../utils/textUtils';
import { isJesusSpokenVerse, RED_LETTER_COLOR } from '../../utils/redLetters';

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
  bookName?: string;
  chapter?: number;
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
  selectionMode = false,
  bookName,
  chapter,
}: BibleVerseSelectableListProps) {

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E8D8C8] bg-white shadow-sm divide-y divide-[#EFE5DA]">
      {verses.map((v) => {
        const isSelected = selectedVerses.includes(v.verse);
        const showCheckbox = mode === 'select' || selectionMode;
        const saved = isSaved?.(v.verse);
        const isRedLetter = bookName && chapter
          ? isJesusSpokenVerse(bookName, chapter, v.verse, v.text)
          : false;
        
        return (
          <div
            key={v.verse}
            id={`verse-${v.verse}`}
            className={`w-full text-left px-4 py-3.5 transition-all relative ${
              isSelected && showCheckbox
                ? 'bg-[#8d95d8]/10'
                : 'bg-white hover:bg-[#FFF8F1]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 flex w-8 shrink-0 flex-col items-center">
                {showCheckbox ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F7EFE7] text-[10px] font-black leading-none text-[#8C6F55]">
                      {v.verse}
                    </span>
                    <button
                      type="button"
                      aria-label={`${v.verse}절 선택`}
                      onClick={() => onToggleVerse(v.verse)}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? 'border-[#8d95d8] bg-[#8d95d8] text-white'
                          : 'border-[#E8D8C8] bg-white text-transparent'
                      }`}
                    >
                      <Check size={14} strokeWidth={4} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`${v.verse}절 저장`}
                    onClick={() => onToggleSave?.(v)}
                    className="flex flex-col items-center gap-1.5 outline-none group"
                  >
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F7EFE7] text-[10px] font-black leading-none text-[#8C6F55] transition-colors group-hover:bg-[#EAD8C4]">
                      {v.verse}
                    </span>
                    <Bookmark 
                      size={18} 
                      fill={saved ? "#6F8F72" : "transparent"} 
                      stroke={saved ? "#6F8F72" : "#D4C4B5"}
                      strokeWidth={2.2}
                      className="transition-all duration-200"
                    />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (showCheckbox) onToggleVerse(v.verse);
                  else onVerseClick(v);
                }}
                className="min-w-0 flex-1 bg-transparent p-0 text-left leading-[1.72] serif-verse"
                style={{
                  fontSize,
                  whiteSpace: 'pre-wrap',
                  color: isRedLetter ? RED_LETTER_COLOR : '#3D3129',
                  fontWeight: isRedLetter ? 650 : 400,
                }}
              >
                {sanitizeScriptureText(v.text)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
