import { useState } from 'react';
import { X } from 'lucide-react';
import { BibleVersePicker } from '../bible/BibleVersePicker';
import { BibleKeywordSearch } from '../bible/BibleKeywordSearch';
import { BIBLE_BOOKS } from '../../data/bibleBooks';
import { addMemoryVerse, isVerseMemorized } from '../../services/memoryStorage';
import confetti from 'canvas-confetti';

import { formatReference } from '../../services/bibleSearch';

interface MemoryAddVerseSheetProps {
  onClose: () => void;
  savedVerses: { ref: string; text: string }[];
  theme: any;
  fontSize: string;
}

type Tab = 'picker' | 'search' | 'saved';

export function MemoryAddVerseSheet({
  onClose,
  savedVerses,
  theme,
  fontSize,
}: MemoryAddVerseSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('picker');
  const [selectedList, setSelectedList] = useState<{ ref: string; text: string; verses?: any[] }[]>([]);

  const handleToggleSelection = (items: any) => {
    if (activeTab === 'picker') {
      const data = items as { bookId: string; bookName: string; chapter: number; verses: { verse: number; text: string }[] };
      if (data.verses.length === 0) {
        setSelectedList([]);
        return;
      }
      
      const ref = formatReference(data.bookName, data.chapter, data.verses.map(v => v.verse));
      const combinedText = data.verses.map(v => v.text).join(' ');
      
      setSelectedList([{ 
        ref, 
        text: combinedText, 
        verses: data.verses.map(v => ({ ...v, bookId: data.bookId, bookName: data.bookName, chapter: data.chapter })) 
      }]);
    } else {
      // For search/saved, items is { ref, text }[]
      const item = items[0];
      if (!item) return;
      
      const exists = selectedList.find(i => i.ref === item.ref);
      if (exists) {
        setSelectedList(selectedList.filter(i => i.ref !== item.ref));
      } else {
        setSelectedList([...selectedList, item]);
      }
    }
  };

  const handleAdd = () => {
    if (selectedList.length === 0) return;

    let addedCount = 0;
    selectedList.forEach(v => {
      if (!isVerseMemorized(v.ref, v.text)) {
        addMemoryVerse({
          ref: v.ref,
          text: v.text,
          source: activeTab === 'picker' ? 'bible-picker' : 
                  activeTab === 'search' ? 'keyword-search' : 'saved'
        } as any);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.8 } });
      onClose();
    } else {
      alert('이미 추가된 말씀입니다.');
    }
  };

  return (
    <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-[92dvh] max-h-[calc(100dvh-12px)] min-h-0 bg-[#FDF6F0] rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden border-t" style={{ borderColor: theme.line }}>
        <div className="w-10 h-1.5 bg-gray-300/40 rounded-full mx-auto my-3 flex-shrink-0" />
        
        <header className="px-5 pb-4 flex items-center justify-between flex-shrink-0">
          <h2 className="title-font text-2xl font-black" style={{ color: theme.text }}>암송 구절 추가</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X size={24} style={{ color: theme.text }} />
          </button>
        </header>

        <nav className="px-5 flex gap-2 overflow-x-auto no-scrollbar mb-4 flex-shrink-0">
          {(['picker', 'search', 'saved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedList([]);
              }}
              className={`px-6 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all border ${
                activeTab === tab
                ? 'shadow-sm text-white'
                : 'bg-white'
              }`}
              style={{ 
                background: activeTab === tab ? theme.accent : 'white',
                borderColor: activeTab === tab ? theme.accent : theme.line,
                color: activeTab === tab ? 'white' : theme.sub
              }}
            >
              {tab === 'picker' ? '본문에서 선택' : 
               tab === 'search' ? '단어로 검색' : '저장된 말씀'}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-28">
          {activeTab === 'picker' && (
            <div className="bg-white p-4 rounded-3xl border shadow-sm" style={{ borderColor: theme.line }}>
              <BibleVersePicker
                mode="select"
                initialBook={BIBLE_BOOKS[42]} // 요한복음
                initialChapter={3}
                onSelectVerses={handleToggleSelection}
                fontSize={fontSize}
              />
            </div>
          )}

          {activeTab === 'search' && (
            <BibleKeywordSearch
              onSelectVerses={handleToggleSelection}
              selectedRefs={selectedList.map(i => i.ref)}
            />
          )}

          {activeTab === 'saved' && (
            <div className="space-y-4">
              {savedVerses.length === 0 ? (
                <div className="text-center py-24 rounded-[32px] border-2 border-dashed" style={{ borderColor: theme.line, color: theme.sub }}>
                  <p className="text-sm font-black">저장된 말씀이 없습니다.</p>
                </div>
              ) : (
                savedVerses.map(v => {
                  const isSelected = selectedList.find(i => i.ref === v.ref);
                  return (
                    <button
                      key={v.ref}
                      onClick={() => handleToggleSelection([v])}
                      className={`w-full text-left p-6 rounded-[28px] border transition-all ${
                        isSelected
                        ? 'shadow-md border-2'
                        : 'bg-white'
                      }`}
                      style={{ 
                        borderColor: isSelected ? theme.accent : theme.line,
                        background: isSelected ? `${theme.accent}08` : 'white'
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="title-font text-sm font-black" style={{ color: theme.accent }}>{v.ref}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-white' : 'bg-white'
                        }`} style={{ borderColor: isSelected ? theme.accent : theme.line }}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed serif-verse" style={{ color: theme.text }}>
                        {v.text}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </main>

        <footer 
          className="relative z-10 flex-shrink-0 px-5 pt-4 bg-white border-t shadow-[0_-10px_24px_rgba(61,49,41,0.06)]" 
          style={{ 
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1100,
            borderColor: theme.line, 
            paddingBottom: `calc(80px + env(safe-area-inset-bottom))` 
          }}
        >
          {selectedList.length > 0 && (
            <div className="mb-2 truncate text-xs font-bold" style={{ color: theme.sub }}>
              선택됨: {selectedList.map(item => item.ref).join(', ')}
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={selectedList.length === 0}
            className="w-full min-h-[56px] rounded-[20px] font-black text-base shadow-xl transition-all disabled:opacity-40 disabled:grayscale active:scale-[0.98]"
            style={{ background: theme.peach, color: theme.text }}
          >
            {selectedList.length > 0 
              ? `${selectedList.length}개의 말씀 암송 추가하기` 
              : '말씀을 선택해 주세요'}
          </button>
        </footer>
      </div>
    </div>
  );
}
