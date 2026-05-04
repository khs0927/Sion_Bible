import { Check, Bookmark, BookmarkCheck, Copy } from 'lucide-react';
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
}: BibleVerseSelectableListProps) {

  return (
    <div className="space-y-3">
      {verses.map((v) => {
        const isSelected = selectedVerses.includes(v.verse);
        const saved = isSaved ? isSaved(v.verse) : false;
        
        return (
          <button
            key={v.verse}
            id={`verse-${v.verse}`}
            onClick={() => {
              if (mode === 'select') {
                onToggleVerse(v.verse);
              } else {
                onVerseClick(v);
              }
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all relative ${
              isSelected && mode === 'select'
                ? 'bg-[#8d95d8]/10 border-[#8d95d8] shadow-sm'
                : 'bg-white border-white shadow-sm hover:border-[#F5C292]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                isSelected && mode === 'select'
                  ? 'bg-[#8d95d8] text-white'
                  : 'bg-[#FFF8F1] text-[#A17C5B]'
              }`}>
                {isSelected && mode === 'select' ? <Check size={14} strokeWidth={4} /> : v.verse}
              </div>

              {mode === 'read' && (
                <div className="flex items-center gap-1">
                   {onCopy && (
                    <span 
                      className="p-2 rounded-xl bg-[#FFF8F1] text-[#A17C5B] hover:bg-[#FDF2E7] transition-colors"
                      onClick={(e) => { e.stopPropagation(); onCopy(v); }}
                    >
                      <Copy size={14} />
                    </span>
                  )}
                  {onToggleSave && (
                    <span 
                      className={`p-2 rounded-xl transition-colors ${
                        saved ? 'bg-[#8d95d8] text-white' : 'bg-[#FFF8F1] text-[#A17C5B] hover:bg-[#FDF2E7]'
                      }`}
                      onClick={(e) => { e.stopPropagation(); onToggleSave(v); }}
                    >
                      {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p 
                className="leading-relaxed text-[#3D3129] serif-verse"
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
