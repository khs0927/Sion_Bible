import { useState, useMemo } from 'react';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';
import { Search, X } from 'lucide-react';
import { KawaiiBibleIcon } from '../icons';

interface BibleBookChapterSelectorProps {
  selectedBook: BibleBook;
  selectedChapter: number;
  onSelectBook: (book: BibleBook) => void;
  onSelectChapter: (chapter: number) => void;
}

import { getSectionTheme, TESTAMENT_THEMES } from '../../services/bibleSectionTheme';

export function BibleBookChapterSelector({
  selectedBook,
  onSelectBook,
  onSelectChapter,
}: BibleBookChapterSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [testament, setTestament] = useState<'old' | 'new' | 'all'>('all');

  const filteredBooks = useMemo(() => 
    BIBLE_BOOKS.filter(b => {
      const matchesTestament = testament === 'all' || b.testament === testament;
      const matchesSearch = !bookSearch || b.name.includes(bookSearch) || b.abbr.includes(bookSearch);
      return matchesTestament && matchesSearch;
    }), [bookSearch, testament]);


  return (
    <div className="space-y-3">
      {/* Removed duplicate icon button as it is already in the main header */}


      {showPicker && (
        <div className="fixed inset-0 z-[200] flex items-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          />
          <div className="relative w-full max-h-[80vh] bg-[#FDF6F0] rounded-t-[32px] p-6 overflow-hidden flex flex-col shadow-2xl border-t border-white">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[#3D3129]">성경 책 선택</h3>
              <button onClick={() => setShowPicker(false)} className="p-2 rounded-full bg-black/5">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {(['all', 'old', 'new'] as const).map(k => {
                const tabTheme = TESTAMENT_THEMES[k];
                const isActive = testament === k;
                return (
                  <button
                    key={k}
                    onClick={() => setTestament(k)}
                    className="px-4 py-2 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: isActive ? tabTheme.bg : 'white',
                      color: isActive ? tabTheme.text : '#8c786e',
                      border: `1px solid ${isActive ? tabTheme.border : '#e8d8ce'}`,
                      boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    {k === 'all' ? '전체' : k === 'old' ? '구약' : '신약'}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#e8d8ce] px-4 py-3 mb-6 focus-within:border-[#8d95d8] transition-colors">
              <Search size={18} className="text-[#8c786e]" />
              <input
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
                placeholder="책 이름 검색 (예: 요한, 창)"
                className="flex-1 bg-transparent outline-none text-sm font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2 pb-8">
                {filteredBooks.map(book => {
                  const isSelected = selectedBook.id === book.id;
                  const sTheme = getSectionTheme(book.section);
                  return (
                    <button
                      key={book.id}
                      onClick={() => {
                        onSelectBook(book);
                        onSelectChapter(1);
                        setShowPicker(false);
                      }}
                      className="flex flex-col items-center justify-center py-3 rounded-xl border transition-all"
                      style={{
                        background: sTheme.bg,
                        borderColor: isSelected ? '#8d95d8' : sTheme.border,
                        color: sTheme.text,
                        borderWidth: isSelected ? 2 : 1,
                        boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <span className="text-[9px] opacity-60 mb-0.5">{book.sectionLabel}</span>
                      <span className="text-[11px] font-black">{book.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
