import { Check } from 'lucide-react';
import { sanitizeScriptureText } from '../../utils/textUtils';
import verseSaveIcon from '../../assets/design/verse-actions/save.png';

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
  selectionMode = false,
}: BibleVerseSelectableListProps) {

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E8D8C8] bg-white shadow-sm divide-y divide-[#EFE5DA]">
      {verses.map((v) => {
        const isSelected = selectedVerses.includes(v.verse);
        const showCheckbox = mode === 'select' || selectionMode;
        
        return (
          <div
            key={v.verse}
            id={`verse-${v.verse}`}
            className={`w-full text-left px-3 py-2.5 transition-all relative ${
              isSelected && showCheckbox
                ? 'bg-[#8d95d8]/10'
                : 'bg-white hover:bg-[#FFF8F1]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-[0.18em] flex w-6 shrink-0 flex-col items-center gap-1">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F7EFE7] text-[10px] font-black leading-none text-[#8C6F55]">
                  {v.verse}
                </span>
                {showCheckbox ? (
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
                ) : (
                  <button
                    type="button"
                    aria-label={`${v.verse}절 저장`}
                    onClick={() => onToggleSave?.(v)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-transform active:scale-95 ${
                      isSaved?.(v.verse) ? 'scale-105' : ''
                    }`}
                  >
                    <img src={verseSaveIcon} alt="" aria-hidden="true" className="block h-7 w-7 object-contain" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (showCheckbox) onToggleVerse(v.verse);
                  else onVerseClick(v);
                }}
                className="min-w-0 flex-1 bg-transparent p-0 text-left leading-[1.72] text-[#3D3129] serif-verse"
                style={{ fontSize }}
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
