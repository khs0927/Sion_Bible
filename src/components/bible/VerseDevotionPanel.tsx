import { useEffect, useState } from 'react';
import { getOrGenerateVerseDevotion, readCachedVerseDevotion, type VerseDevotionResult } from '../../services/verseDevotionApi';
import { VerseQuestionPanel } from './VerseQuestionPanel';
import { KawaiiMeditationIcon, KawaiiPrayerIcon } from '../icons';
import { ensureAmen } from '../../utils/prayer';

interface SelectedVerse {
  ref: string;
  text: string;
  title?: string;
  meditation?: string;
  prayer?: string;
  application?: string;
}

interface VerseDevotionPanelProps {
  selectedVerse: SelectedVerse | null;
  onGoToMemory?: (verse: SelectedVerse) => void;
  fontSize?: string;
}

function stripMarkdown(text: string) {
  return text.replace(/\*\*/g, '');
}

export function VerseDevotionPanel({
  selectedVerse,
  fontSize = '1rem',
}: VerseDevotionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [devotion, setDevotion] = useState<VerseDevotionResult | null>(null);

  useEffect(() => {
    if (!selectedVerse) return;
    let cancelled = false;

    async function run() {
      if (!selectedVerse) return;

      if (selectedVerse.meditation || selectedVerse.prayer) {
        setDevotion({
          title: selectedVerse.title || '말씀 묵상',
          keyPhrase: '',
          meditation: selectedVerse.meditation || '',
          prayer: selectedVerse.prayer || '',
          application: selectedVerse.application || '',
          reflectionQuestion: '',
          fallback: false,
        });
        setLoading(false);
        return;
      }

      const cached = readCachedVerseDevotion(selectedVerse.ref, selectedVerse.text);
      if (cached) {
        setDevotion(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setDevotion(null);

      const { result } = await getOrGenerateVerseDevotion({
        ref: selectedVerse.ref,
        verseText: selectedVerse.text,
      });

      if (!cancelled) {
        setDevotion(result);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedVerse?.ref, selectedVerse?.text, selectedVerse?.meditation, selectedVerse?.prayer]);

  if (!selectedVerse) return null;

  return (
    <div className="mt-2 space-y-3">
      {devotion && (
        <>
          <article className="rounded-[22px] bg-white/70 p-5 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-1 mb-2 text-[#A17C5B]">
              <KawaiiMeditationIcon size={22} />
              <p className={`text-xs font-bold ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '묵상할 바를 생각중입니다...' : '묵상'}
              </p>
            </div>
            <h3 className="text-lg font-black text-[#3D3129] mb-2 leading-tight title-font">
              {devotion.title}
            </h3>
            {devotion.keyPhrase && (
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-[#FFF8F1] px-3 py-1.5 text-[11px] font-black text-[#A17C5B] border border-[#F5E6D3]">
                <span className="opacity-70">핵심 표현</span>
                <span className="truncate text-[#3D3129]">{devotion.keyPhrase}</span>
              </div>
            )}
            <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed serif-verse" style={{ fontSize }}>
              {stripMarkdown(devotion.meditation)}
            </p>
          </article>

          <article className="rounded-[22px] bg-white/70 p-5 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
            <div className="flex items-center gap-1 mb-2 text-[#A17C5B]">
              <KawaiiPrayerIcon size={22} />
              <p className={`text-xs font-bold ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '기도할 바를 생각중입니다...' : '기도문'}
              </p>
            </div>
            <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed serif-verse" style={{ fontSize }}>
              {ensureAmen(stripMarkdown(devotion.prayer))}
            </p>
          </article>

          {devotion.application && (
            <article className="rounded-[20px] bg-white/70 p-4 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
              <p className="text-[11px] font-bold text-[#A17C5B] mb-1.5">오늘의 적용</p>
              <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed font-medium serif-verse" style={{ fontSize: `calc(${fontSize} * 0.95)` }}>
                {stripMarkdown(devotion.application)}
              </p>
            </article>
          )}

          {devotion.reflectionQuestion && (
            <article className="rounded-[20px] bg-white/70 p-4 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
              <p className="text-[11px] font-bold text-[#A17C5B] mb-1.5">오늘 붙들 질문</p>
              <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed font-black serif-verse" style={{ fontSize: `calc(${fontSize} * 0.95)` }}>
                {stripMarkdown(devotion.reflectionQuestion)}
              </p>
            </article>
          )}

          <VerseQuestionPanel verse={selectedVerse} devotion={devotion} />
        </>
      )}

      {loading && !devotion && (
        <>
          <DevotionLoadingMessage />
          <div className="space-y-3 animate-pulse">
            <div className="h-40 rounded-[22px] bg-white/40 border border-white/50" />
            <div className="h-32 rounded-[22px] bg-white/40 border border-white/50" />
          </div>
        </>
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

      <p className="text-lg font-black text-[#3D3129] mb-2">
        묵상할 바를 생각중입니다...
      </p>
      <p className="text-xs leading-5 text-[#7B6A5D] font-medium serif-verse">
        말씀을 다시 읽어보고 그 의미를 묵상해봅시다.
      </p>
    </div>
  );
}
