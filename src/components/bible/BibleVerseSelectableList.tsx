import { Check } from 'lucide-react';
import { decodeHtml } from '../../utils/textUtils';

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
  selectionMode = false,
}: BibleVerseSelectableListProps) {

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E8D8C8] bg-white shadow-sm divide-y divide-[#EFE5DA]">
      {verses.map((v) => {
        const isSelected = selectedVerses.includes(v.verse);
        const showCheckbox = mode === 'select' || selectionMode;
        
        return (
          <button
            key={v.verse}
            id={`verse-${v.verse}`}
            onClick={() => {
              if (showCheckbox) {
                onToggleVerse(v.verse);
              } else {
                onVerseClick(v);
              }
            }}
            className={`w-full text-left px-3 py-2.5 transition-all relative ${
              isSelected && mode === 'select'
                ? 'bg-[#8d95d8]/10'
                : 'bg-white hover:bg-[#FFF8F1]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-[0.18em] inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black leading-none ${
                isSelected && showCheckbox
                  ? 'bg-[#8d95d8] text-white'
                  : 'bg-[#F7EFE7] text-[#8C6F55]'
              }`}>
                {isSelected && showCheckbox ? <Check size={12} strokeWidth={4} /> : v.verse}
              </span>

              <p 
                className="min-w-0 flex-1 leading-[1.72] text-[#3D3129] serif-verse"
                style={{ fontSize }}
              >
                {decodeHtml(v.text)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
