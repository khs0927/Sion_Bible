import { useEffect, useState, type ReactNode } from 'react';
import { cleanDevotionText, createContextualFallback, getOrGenerateVerseDevotion, getVerseDevotionCacheKey, readCachedVerseDevotion, type VerseDevotionResult } from '../../services/verseDevotionApi';
import { VerseQuestionPanel } from './VerseQuestionPanel';
import { Bookmark, Check } from 'lucide-react';
import { KawaiiVerseIcon } from '../icons';
import { ensureAmen } from '../../utils/prayer';

interface SelectedVerse {
  ref: string;
  text: string;
  title?: string;
  meditation?: string;
  prayer?: string;
  application?: string | string[];
}

type VisibleSection = 'all' | 'explanation' | 'meditation' | 'prayer' | 'question';
type GenerationMode = 'fast' | 'deep';

interface VerseDevotionPanelProps {
  selectedVerse: SelectedVerse | null;
  initialDevotion?: VerseDevotionResult | null;
  onGoToMemory?: (verse: SelectedVerse) => void;
  onSaveDevotionSection?: (section: 'explanation' | 'meditation' | 'prayer' | 'application', devotion: VerseDevotionResult) => void;
  fontSize?: string;
  visibleSection?: VisibleSection;
  compact?: boolean;
  generationMode?: GenerationMode;
}

function stripMarkdown(text: string) {
  return cleanDevotionText(String(text || '').replace(/\*\*/g, ''));
}

function softenDevotionText(text: string) {
  return text
    .replace(/예수께서/g, '예수님께서')
    .replace(/예수에게/g, '예수님께')
    .replace(/예수를/g, '예수님을')
    .replace(/예수의/g, '예수님의')
    .replace(/예수는/g, '예수님은')
    .replace(/예수가/g, '예수님이')
    .replace(/예수와/g, '예수님과')
    .replace(/예수 안/g, '예수 그리스도 안')
    .replace(/(?<!그리스도 )예수(?!님| 그리스도)/g, '예수님')
    .replace(/국한하지 말고/g, '국한하기보다')
    .replace(/기억하라/g, '기억해볼 수 있습니다')
    .replace(/참석해 보세요/g, '기억해 보세요')
    .replace(/참석해보세요/g, '기억해 보세요');
}

function formatDevotionText(text: string) {
  return softenDevotionText(stripMarkdown(text))
    .replace(/(?:^|\s)\d+[.)]\s*/g, ' ')
    .replace(/\s*(복음적 관점|오해 방지)\s*:\s*/g, '\n\n')
    .replace(/\s+(그러나|그리고 이어서|따라서|그러므로|다만|이 구절의 핵심은|이 본문은|오늘 이 말씀은)\s+/g, '\n\n$1 ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function DevotionParagraph({ children, fontSize, strong = false }: { children: string; fontSize: string; strong?: boolean }) {
  return (
    <div
      className={`whitespace-pre-line text-[#5C4D42] leading-relaxed serif-verse ${strong ? 'font-semibold' : ''}`}
      style={{ fontSize, fontFamily: "'MaruBuri', 'S-Core Dream', serif" }}
    >
      {formatDevotionText(children)}
    </div>
  );
}

function asApplicationList(value: VerseDevotionResult['application']) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(/\n+/)
    .map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

function devotionQuestion(devotion: VerseDevotionResult) {
  return String(devotion.question || devotion.reflectionQuestion || '').trim();
}

function SectionCard({
  title,
  children,
  delay = '',
  tone = 'default',
  titleSize = 'label',
  titleFontSize,
  onBookmark,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  delay?: string;
  tone?: 'default' | 'prayer' | 'question';
  titleSize?: 'label' | 'body';
  titleFontSize?: string;
  onBookmark?: () => void;
  compact?: boolean;
}) {
  const toneClass = tone === 'prayer'
    ? 'bg-[#FFF8F1]/80'
    : tone === 'question'
      ? 'bg-[#F6F2E8]/90 border-[#E4D1B8]'
      : 'bg-white/70';

  return (
    <article className={`${compact ? 'rounded-[18px] p-4' : 'rounded-[22px] p-5'} shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500 ${delay} ${toneClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          className={`font-bold text-[#A17C5B] serif-verse ${title.includes('불러오고') ? 'animate-pulse' : ''} ${titleSize === 'body' ? '' : 'text-[11px]'}`}
          style={{ fontFamily: "'MaruBuri', 'S-Core Dream', serif", fontSize: titleSize === 'body' ? titleFontSize || '1rem' : undefined }}
        >
          {title}
        </p>
        {onBookmark && (
          <button
            type="button"
            aria-label={`${title} 저장`}
            onClick={onBookmark}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-[#EAD8C4] bg-white/80 text-[#A17C5B] shadow-sm"
          >
            <Bookmark size={15} strokeWidth={2.3} />
          </button>
        )}
      </div>
      {children}
    </article>
  );
}

export function VerseDevotionPanel({
  selectedVerse,
  initialDevotion,
  onSaveDevotionSection,
  fontSize = '1rem',
  visibleSection = 'all',
  compact = false,
  generationMode = 'fast',
}: VerseDevotionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [devotion, setDevotion] = useState<VerseDevotionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!selectedVerse) {
      setDevotion(null);
      setErrorMessage('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const requestKey = `${selectedVerse.ref}:${selectedVerse.text}:${generationMode}`;

    async function run() {
      if (!selectedVerse) return;
      const isCurrentRequest = () => !cancelled && requestKey === `${selectedVerse.ref}:${selectedVerse.text}:${generationMode}`;

      if (initialDevotion) {
        setDevotion(initialDevotion);
        setErrorMessage('');
        setLoading(false);
        return;
      }

      setDevotion(createContextualFallback(selectedVerse.ref, selectedVerse.text, 'LOCAL_INITIAL'));
      setErrorMessage('');
      setLoading(true);

      const cacheKey = getVerseDevotionCacheKey(selectedVerse.ref, selectedVerse.text);
      const deepMarkerKey = `${cacheKey}:deep-v1`;
      if (generationMode === 'deep' && localStorage.getItem(deepMarkerKey) !== '1') {
        localStorage.removeItem(cacheKey);
      }

      const cached = readCachedVerseDevotion(selectedVerse.ref, selectedVerse.text);
      if (cached) {
        if (isCurrentRequest()) {
          setDevotion(cached);
          setErrorMessage('');
          setLoading(false);
        }
        return;
      }

      try {
        const response = await getOrGenerateVerseDevotion({
          ref: selectedVerse.ref,
          verseText: selectedVerse.text,
          mode: generationMode,
        });

        if (isCurrentRequest()) {
          if (response?.result) {
            setDevotion(response.result);
            if (generationMode === 'deep' && !response.result.fallback) localStorage.setItem(deepMarkerKey, '1');
          }
          setErrorMessage('');
          setLoading(false);
        }
      } catch {
        if (isCurrentRequest()) {
          setErrorMessage('');
          setLoading(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [selectedVerse?.ref, selectedVerse?.text, selectedVerse?.meditation, selectedVerse?.prayer, initialDevotion, generationMode]);

  if (!selectedVerse) return null;

  const showAll = visibleSection === 'all';
  const showExplanation = showAll || visibleSection === 'explanation';
  const showMeditation = showAll || visibleSection === 'meditation';
  const showPrayer = showAll || visibleSection === 'prayer';
  const showQuestion = showAll || visibleSection === 'question';

  return (
    <div className={`${compact ? 'mt-0' : 'mt-2'} space-y-3`}>
      {devotion && (
        <>
          {showAll && (
            <article className="rounded-[24px] bg-white/75 p-5 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-1 mb-2 text-[#A17C5B]">
                <KawaiiVerseIcon size={22} />
                <p className={`text-xs font-bold ${loading && devotion.fallback ? 'animate-pulse' : ''}`}>
                  {loading && devotion.fallback ? '묵상문을 불러오고 있습니다.' : '말씀 해설'}
                </p>
              </div>
              <h3 className="text-lg font-black text-[#3D3129] mb-3 leading-tight title-font">{devotion.title}</h3>
              {devotion.coreMessage && (
                <div className="mb-3 rounded-[18px] border border-[#F5E6D3] bg-[#FFF8F1] px-4 py-3">
                  <p className="mb-1 text-[10px] font-bold text-[#A17C5B]">핵심 메시지</p>
                  <p className="text-[14px] leading-relaxed font-bold text-[#3D3129] serif-verse">{stripMarkdown(devotion.coreMessage)}</p>
                </div>
              )}
            </article>
          )}

          {showExplanation && devotion.explanation && (
            <SectionCard title={loading ? '해설을 불러오고 있습니다.' : '해설'} delay="delay-75" titleSize="body" titleFontSize={fontSize} compact={compact} onBookmark={() => onSaveDevotionSection?.('explanation', devotion)}>
              <DevotionParagraph fontSize={fontSize}>{devotion.explanation}</DevotionParagraph>
            </SectionCard>
          )}

          {showMeditation && (
            <SectionCard title={loading ? '묵상문을 불러오고 있습니다.' : '묵상'} delay="delay-100" titleSize="body" titleFontSize={fontSize} compact={compact} onBookmark={() => onSaveDevotionSection?.('meditation', devotion)}>
              <DevotionParagraph fontSize={fontSize}>{devotion.meditation}</DevotionParagraph>
            </SectionCard>
          )}

          {showPrayer && (
            <SectionCard title={loading ? '기도문을 불러오고 있습니다.' : '기도문'} delay="delay-150" tone="prayer" titleSize="body" titleFontSize={fontSize} compact={compact} onBookmark={() => onSaveDevotionSection?.('prayer', devotion)}>
              <DevotionParagraph fontSize={fontSize}>{ensureAmen(stripMarkdown(devotion.prayer))}</DevotionParagraph>
            </SectionCard>
          )}

          {showAll && asApplicationList(devotion.application).length > 0 && (
            <SectionCard title="오늘의 적용" delay="delay-200" titleSize="body" titleFontSize={fontSize} onBookmark={() => onSaveDevotionSection?.('application', devotion)}>
              <div className="space-y-2">
                {asApplicationList(devotion.application).map((item, index) => (
                  <div key={`${item}-${index}`} className="flex gap-2 rounded-[16px] border border-[#F5E6D3] bg-white/65 px-3 py-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F1E5] text-[#6F8F72]">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <p className="text-[#5C4D42] leading-relaxed serif-verse" style={{ fontSize: `calc(${fontSize} * 0.92)` }}>{formatDevotionText(item)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {showAll && devotionQuestion(devotion) && (
            <SectionCard title="오늘 붙들 질문" delay="delay-250" tone="question" titleSize="body" titleFontSize={fontSize}>
              <DevotionParagraph fontSize={fontSize} strong>{devotionQuestion(devotion)}</DevotionParagraph>
            </SectionCard>
          )}

          {showQuestion && <VerseQuestionPanel verse={selectedVerse} devotion={devotion} />}
        </>
      )}

      {loading && !devotion && <DevotionLoadingMessage />}
      {!loading && !devotion && errorMessage && (
        <div className="rounded-[24px] bg-white/70 p-5 text-center border border-white/80 text-[#7B6A5D] serif-verse leading-relaxed">{errorMessage}</div>
      )}
    </div>
  );
}

function DevotionLoadingMessage() {
  return (
    <div className="rounded-[24px] bg-white/60 p-6 text-center border border-white/80 backdrop-blur-sm">
      <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-[#F5C292] flex items-center justify-center">
        <div className="h-5 w-5 rounded-full bg-white opacity-40 animate-ping" />
      </div>
      <p className="text-lg font-black text-[#3D3129] mb-2">말씀을 깊이 살펴보고 있습니다.</p>
      <p className="text-xs leading-5 text-[#7B6A5D] font-medium serif-verse">기존 깊은 원고 스타일로 해설과 묵상, 기도를 함께 준비하고 있습니다.</p>
    </div>
  );
}
