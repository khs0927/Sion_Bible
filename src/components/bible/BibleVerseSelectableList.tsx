import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, Copy, HeartHandshake, Highlighter, MessageSquareText, Minus, Palette, PenLine, X } from 'lucide-react';
import { sanitizeScriptureText } from '../../utils/textUtils';

interface Verse {
  verse: number;
  text: string;
}

type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue' | 'purple';
type UnderlineStyle = 'none' | 'solid' | 'dashed' | 'wavy';

type VerseAnnotation = {
  color: HighlightColor;
  underline: UnderlineStyle;
};

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

const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#FFF2A8',
  green: '#DFF0C8',
  pink: '#FFD7E0',
  blue: '#D8E8FF',
  purple: '#E9DBFF',
};

function annotationKey(verse: number) {
  return `sion_bible_annotation_${window.location.pathname}_${verse}`;
}

function readAnnotation(verse: number): VerseAnnotation | null {
  try {
    const raw = localStorage.getItem(annotationKey(verse));
    return raw ? JSON.parse(raw) as VerseAnnotation : null;
  } catch {
    return null;
  }
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
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Record<number, VerseAnnotation>>({});

  useEffect(() => {
    const next: Record<number, VerseAnnotation> = {};
    for (const verse of verses) {
      const stored = readAnnotation(verse.verse);
      if (stored) next[verse.verse] = stored;
    }
    setAnnotations(next);
  }, [verses]);

  const activeAnnotation = useMemo(
    () => activeVerse ? annotations[activeVerse] ?? { color: 'yellow' as const, underline: 'none' as const } : null,
    [activeVerse, annotations],
  );

  const updateAnnotation = (patch: Partial<VerseAnnotation>) => {
    if (!activeVerse) return;
    const next = {
      color: activeAnnotation?.color ?? 'yellow',
      underline: activeAnnotation?.underline ?? 'none',
      ...patch,
    };
    setAnnotations((current) => ({ ...current, [activeVerse]: next }));
    localStorage.setItem(annotationKey(activeVerse), JSON.stringify(next));
  };

  const clearAnnotation = () => {
    if (!activeVerse) return;
    localStorage.removeItem(annotationKey(activeVerse));
    setAnnotations((current) => {
      const next = { ...current };
      delete next[activeVerse];
      return next;
    });
  };

  const openVerseTool = (tool: 'commentary' | 'meditation' | 'prayer') => {
    if (!activeVerse) return;
    const verse = verses.find((item) => item.verse === activeVerse);
    if (!verse) return;
    window.dispatchEvent(new CustomEvent('sion:bible-verse-tool', {
      detail: { tool, verse },
    }));
    onVerseClick(verse);
  };

  if (verses.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#E8D8C8] bg-white px-5 py-10 text-center text-sm font-bold text-[#8C786E]">
        이 장에 표시할 말씀이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#EFE5DA] overflow-hidden rounded-[22px] border border-[#E8D8C8] bg-white shadow-sm">
        {verses.map((verse) => {
          const selected = selectedVerses.includes(verse.verse);
          const showCheckbox = mode === 'select' || selectionMode;
          const saved = isSaved?.(verse.verse) ?? false;
          const annotation = annotations[verse.verse];
          const isActive = activeVerse === verse.verse;

          return (
            <div
              key={verse.verse}
              id={`verse-${verse.verse}`}
              className={[
                'relative w-full px-4 py-3.5 text-left transition-all',
                selected && showCheckbox
                  ? 'bg-[#6F8F72]/15 ring-2 ring-inset ring-[#6F8F72]/55'
                  : isActive
                    ? 'ring-2 ring-inset ring-[#D9B84F]/60'
                    : 'bg-white hover:bg-[#FFF8F1]',
              ].join(' ')}
              style={{ backgroundColor: annotation ? HIGHLIGHT_COLORS[annotation.color] : undefined }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex w-9 shrink-0 flex-col items-center gap-2">
                  {showCheckbox ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className={[
                        'inline-flex h-6 min-w-6 items-center justify-center rounded-md text-[10px] font-black leading-none transition-colors',
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
                          'inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 shadow-sm transition-all',
                          selected
                            ? 'border-[#6F8F72] bg-[#6F8F72] text-white shadow-[#6F8F72]/20'
                            : 'border-[#D9CBBE] bg-white text-transparent',
                        ].join(' ')}
                      >
                        <Check size={17} strokeWidth={4} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#F7EFE7] text-[10px] font-black leading-none text-[#8C6F55]">
                        {verse.verse}
                      </span>
                      <button
                        type="button"
                        aria-label={`${verse.verse}절 ${saved ? '저장 취소' : '저장'}`}
                        aria-pressed={saved}
                        onClick={() => onToggleSave?.(verse)}
                        disabled={!onToggleSave}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8D8C8] bg-[#FFFDF8] shadow-sm disabled:cursor-default"
                      >
                        <Bookmark
                          size={17}
                          fill={saved ? '#6F8F72' : 'transparent'}
                          stroke={saved ? '#6F8F72' : '#BFAE9D'}
                          strokeWidth={2.2}
                        />
                      </button>
                      {onCopy && (
                        <button
                          type="button"
                          aria-label={`${verse.verse}절 복사`}
                          onClick={() => onCopy(verse)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8D8C8] bg-[#FFFDF8] text-[#7B6A5D] shadow-sm transition active:scale-90"
                        >
                          <Copy size={17} strokeWidth={2} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (showCheckbox) onToggleVerse(verse.verse);
                    else setActiveVerse(verse.verse);
                  }}
                  className="serif-verse min-w-0 flex-1 bg-transparent p-0 text-left leading-[1.72] text-[#3D3129]"
                  style={{
                    fontSize,
                    whiteSpace: 'pre-wrap',
                    textDecorationLine: annotation?.underline === 'none' ? 'none' : 'underline',
                    textDecorationStyle: annotation?.underline === 'wavy' ? 'wavy' : annotation?.underline === 'dashed' ? 'dashed' : 'solid',
                    textDecorationThickness: annotation?.underline === 'none' ? undefined : '2px',
                    textUnderlineOffset: '5px',
                  }}
                  aria-pressed={isActive}
                >
                  {sanitizeScriptureText(verse.text)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeVerse && activeAnnotation && mode === 'read' && !selectionMode && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[950] mx-auto w-[min(680px,calc(100%-16px))] rounded-[24px] border border-[#E1D5C8] bg-[#FFFDF8]/95 p-3 shadow-[0_18px_45px_rgba(54,43,33,.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#5F5147]">
              <Highlighter size={16} /><span>{activeVerse}절 꾸미기</span>
            </div>
            <button type="button" onClick={() => setActiveVerse(null)} aria-label="구절 도구 닫기" className="rounded-full p-1.5 text-[#78695E]"><X size={18} /></button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-[#8A786B]"><Palette size={14} />색</span>
            {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
              <button key={color} type="button" aria-label={`${color} 형광펜`} aria-pressed={activeAnnotation.color === color} onClick={() => updateAnnotation({ color })} className="h-8 w-8 shrink-0 rounded-full border-2 shadow-sm" style={{ backgroundColor: HIGHLIGHT_COLORS[color], borderColor: activeAnnotation.color === color ? '#5F5147' : '#FFFFFF' }} />
            ))}
            <span className="mx-1 h-7 w-px shrink-0 bg-[#E4D8CB]" />
            <button type="button" onClick={() => updateAnnotation({ underline: 'solid' })} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-black"><Minus size={16} />실선</button>
            <button type="button" onClick={() => updateAnnotation({ underline: 'dashed' })} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-black"><PenLine size={16} />점선</button>
            <button type="button" onClick={clearAnnotation} className="inline-flex h-9 shrink-0 items-center rounded-xl border px-3 text-xs font-black">지우기</button>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-[#E7DCCF] pt-2">
            <button type="button" onClick={() => openVerseTool('commentary')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-white text-xs font-black text-[#5F5147] shadow-sm"><MessageSquareText size={16} />해설</button>
            <button type="button" onClick={() => openVerseTool('meditation')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-white text-xs font-black text-[#5F5147] shadow-sm"><Highlighter size={16} />묵상</button>
            <button type="button" onClick={() => openVerseTool('prayer')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-white text-xs font-black text-[#5F5147] shadow-sm"><HeartHandshake size={16} />기도</button>
          </div>
        </div>
      )}
    </>
  );
}
