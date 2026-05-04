import { useState, useMemo } from 'react';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';
import { Search, X } from 'lucide-react';
import { KawaiiBibleIcon } from '../icons';

interface BibleBookChapterSelectorProps {
  selectedBook: BibleBook;
  selectedChapter: number;
  onSelectBook: (book: BibleBook) => void;
  onSelectChapter: (chapter: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function BibleBookChapterSelector({
  selectedBook,
  onSelectBook,
  onSelectChapter,
  isOpen,
  onClose,
}: BibleBookChapterSelectorProps) {
  const [bookSearch, setBookSearch] = useState('');
  const [testament, setTestament] = useState<'old' | 'new' | 'all'>('all');

  const showPicker = isOpen; // Control visibility from outside
  const setShowPicker = (val: boolean) => !val && onClose?.(); // Handle internal closing

  const filteredBooks = useMemo(() => 
    BIBLE_BOOKS.filter(b => {
      const matchesTestament = testament === 'all' || b.testament === testament;
      const matchesSearch = !bookSearch || b.name.includes(bookSearch) || b.abbr.includes(bookSearch);
      return matchesTestament && matchesSearch;
    }), [bookSearch, testament]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-h-[80vh] bg-[#FDF6F0] rounded-t-[32px] p-6 overflow-hidden flex flex-col shadow-2xl border-t border-white animate-in slide-in-from-bottom duration-300">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#3D3129]">성경 책 선택</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'old', 'new'] as const).map(k => (
            <button
              key={k}
              onClick={() => setTestament(k)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                testament === k 
                ? 'bg-[#8d95d8] text-white shadow-md' 
                : 'bg-white text-[#8c786e] border border-[#e8d8ce]'
              }`}
            >
              {k === 'all' ? '전체' : k === 'old' ? '구약' : '신약'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#e8d8ce] px-4 py-3 mb-6 focus-within:border-[#8d95d8] transition-colors shadow-sm">
          <Search size={18} className="text-[#8c786e]" />
          <input
            value={bookSearch}
            onChange={e => setBookSearch(e.target.value)}
            placeholder="책 이름 검색 (예: 요한, 창)"
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-4 gap-3 pb-8">
            {filteredBooks.map(book => (
              <button
                key={book.id}
                onClick={() => {
                  onSelectBook(book);
                  onSelectChapter(1);
                }}
                className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all active:scale-95 ${
                  selectedBook.id === book.id
                  ? 'bg-[#8d95d8] border-[#8d95d8] text-white shadow-lg'
                  : 'bg-white border-[#e8d8ce] text-[#3D3129] hover:bg-[#FDF2E7]'
                }`}
              >
                <span className="text-xs font-black">{book.name}</span>
                <span className={`text-[10px] mt-1 ${selectedBook.id === book.id ? 'opacity-80' : 'text-[#8c786e]'}`}>
                  {book.chapters}장
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
