import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { getOrGenerateVerseDevotion, readCachedVerseDevotion, type VerseDevotionResult } from '../../services/verseDevotionApi';
import { speakText } from '../../services/speech';
import { VerseQuestionPanel } from './VerseQuestionPanel';
import { KawaiiMeditationIcon, KawaiiPrayerIcon } from '../icons';

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
  onGoToMemory: (verse: SelectedVerse) => void;
  fontSize?: string;
}

export function VerseDevotionPanel({
  selectedVerse,
  onGoToMemory,
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
          meditation: selectedVerse.meditation || '',
          prayer: selectedVerse.prayer || '',
          application: selectedVerse.application || '',
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

  function speakVerseDevotion() {
    if (!selectedVerse || !devotion) return;

    speakText(
      [
        selectedVerse.ref,
        selectedVerse.text,
        '',
        '묵상',
        devotion.meditation,
        '',
        '기도문',
        devotion.prayer,
      ].join('\n'),
      { lang: 'ko-KR', rate: 0.85 },
    );
  }

  if (!selectedVerse) return null;

  return (
    <div className="mt-4 space-y-4">
      {loading && (
        <>
          <DevotionLoadingMessage />
          <div className="space-y-4 animate-pulse">
            <div className="h-40 rounded-[22px] bg-white/40 border border-white/50" />
            <div className="h-32 rounded-[22px] bg-white/40 border border-white/50" />
          </div>
        </>
      )}

      {devotion && !loading && (
        <>
          {devotion.fallback && (
            <div className="flex items-center gap-2 px-4 py-3 bg-[#fdf2e7] border border-[#f5c292]/30 rounded-2xl text-[11px] font-bold text-[#A17C5B] animate-in fade-in duration-300">
              <Info size={14} className="flex-shrink-0" />
              <span>AI 응답이 지연되어 기본 묵상 안내를 먼저 보여드려요.</span>
            </div>
          )}

          <article className="rounded-[22px] bg-white/70 p-5 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 mb-3 text-[#A17C5B]">
              <KawaiiMeditationIcon size={20} />
              <p className="text-xs font-bold">묵상</p>
            </div>
            <h3 className="text-lg font-black text-[#3D3129] mb-3 leading-tight title-font">
              {devotion.title}
            </h3>
            <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed serif-verse" style={{ fontSize }}>
              {devotion.meditation}
            </p>
          </article>

          <article className="rounded-[22px] bg-white/70 p-5 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
            <div className="flex items-center gap-2 mb-3 text-[#A17C5B]">
              <KawaiiPrayerIcon size={20} />
              <p className="text-xs font-bold">기도문</p>
            </div>
            <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed serif-verse" style={{ fontSize }}>
              {devotion.prayer}
            </p>
          </article>

          {devotion.application && (
            <article className="rounded-[22px] bg-white/70 p-5 shadow-sm border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
              <p className="text-xs font-bold text-[#A17C5B] mb-2">오늘의 적용</p>
              <p className="whitespace-pre-line text-[#5C4D42] leading-relaxed font-medium serif-verse" style={{ fontSize }}>
                {devotion.application}
              </p>
            </article>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={speakVerseDevotion}
              className="rounded-full bg-white px-4 py-3.5 font-black text-[#3D3129] shadow-sm hover:bg-[#FDF2E7] transition-colors border border-white/50"
            >
              듣기
            </button>

            <button
              type="button"
              onClick={() => onGoToMemory(selectedVerse)}
              className="rounded-full bg-[#F5C292] px-4 py-3.5 font-black text-[#3D3129] shadow-sm hover:bg-[#F3B070] transition-colors"
            >
              암송하러 가기
            </button>
          </div>

          <VerseQuestionPanel verse={selectedVerse} devotion={devotion} />
        </>
      )}
    </div>
  );
}

function DevotionLoadingMessage() {
  return (
    <div className="rounded-[24px] bg-white/60 p-8 text-center border border-white/80 backdrop-blur-sm">
      <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full bg-[#F5C292] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full bg-white opacity-40 animate-ping" />
      </div>

      <p className="text-xl font-black text-[#3D3129] mb-3">
        묵상과 기도문이 작성되고 있어요 :)
      </p>

      <p className="text-sm leading-6 text-[#7B6A5D] font-medium serif-verse">
        본문 구절을 읽고 잠시 눈을 감고 묵상해봅시다.
      </p>
    </div>
  );
}
