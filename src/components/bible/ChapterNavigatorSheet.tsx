import { useState, useMemo, type CSSProperties } from 'react';
import { X, ChevronLeft, Search } from 'lucide-react';
import { KawaiiBibleIcon } from '../icons';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';

interface ChapterNavigatorSheetProps {
  open: boolean;
  onClose: () => void;
  selectedBook: BibleBook;
  currentChapter: number;
  onSelectBook: (book: BibleBook) => void;
  onSelectChapter: (chapter: number) => void;
  T: any; // Theme object
}

export function ChapterNavigatorSheet({
  open,
  onClose,
  selectedBook,
  currentChapter,
  onSelectBook,
  onSelectChapter,
  T,
}: ChapterNavigatorSheetProps) {
  const [mode, setMode] = useState<'chapters' | 'books'>('chapters');
  const [testament, setTestament] = useState<'all' | 'old' | 'new'>('all');
  const [bookSearch, setBookSearch] = useState('');
  
  // Use the book currently being explored in the sheet, defaults to the app's selected book
  const [browsingBook, setBrowsingBook] = useState<BibleBook>(selectedBook);

  if (!open) return null;

  const filteredBooks = BIBLE_BOOKS.filter(b => {
    const matchesTestament = testament === 'all' || b.testament === testament;
    const matchesSearch = !bookSearch || b.name.includes(bookSearch) || b.abbr.includes(bookSearch);
    return matchesTestament && matchesSearch;
  });

  const chapters = Array.from({ length: browsingBook.chapters }, (_, i) => i + 1);
  const isPsalm = browsingBook.name === '시편';

  const handleBookClick = (book: BibleBook) => {
    setBrowsingBook(book);
    setMode('chapters');
  };

  const handleChapterClick = (ch: number) => {
    if (browsingBook.id !== selectedBook.id) {
      onSelectBook(browsingBook);
    }
    onSelectChapter(ch);
    onClose();
    // Reset state for next open
    setTimeout(() => {
      setMode('chapters');
      setBrowsingBook(selectedBook);
    }, 300);
  };

  const handleBackToBooks = () => {
    setMode('books');
  };

  return (
    <div style={overlayStyle}>
      <div onClick={onClose} style={backdropStyle} />
      <div style={{ ...sheetStyle, background: T.panel, borderTop: `1px solid ${T.line}` }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: T.line, borderRadius: 2, margin: '12px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {mode === 'chapters' && (
              <button 
                onClick={handleBackToBooks}
                aria-label="성경 책 선택으로 돌아가기"
                style={{ 
                  width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: T.solid, border: `1px solid ${T.line}`, color: T.sub, cursor: 'pointer', outline: 'none'
                }}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <KawaiiBibleIcon size={16} framed={false} />
                <h2 className="title-font" style={{ fontSize: '1.25rem', fontWeight: 900, color: T.text }}>
                  {mode === 'chapters' ? browsingBook.name : '성경 책 선택'}
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: T.sub, marginTop: 2, fontWeight: 600 }}>
                {mode === 'chapters' ? `이동할 ${isPsalm ? '편' : '장'}을 선택하세요` : '읽으실 성경 권을 선택하세요'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.solid, border: `1px solid ${T.line}`, color: T.text, cursor: 'pointer', outline: 'none'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters for Book Mode */}
        {mode === 'books' && (
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['all', 'old', 'new'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setTestament(k)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                    border: testament === k ? 'none' : `1px solid ${T.line}`,
                    background: testament === k ? 'linear-gradient(145deg, #8d95d8, #7a82c2)' : T.solid,
                    color: testament === k ? '#fff' : T.sub,
                    cursor: 'pointer', outline: 'none'
                  }}
                >
                  {k === 'all' ? '전체' : k === 'old' ? '구약' : '신약'}
                </button>
              ))}
            </div>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 8, background: T.solid, borderRadius: 14, 
              padding: '0 12px', border: `1px solid ${T.line}`, height: 40 
            }}>
              <Search size={16} style={{ color: T.sub }} />
              <input 
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
                placeholder="책 이름 검색..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: T.text, fontWeight: 600 }}
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '0 16px 40px', maxHeight: '60vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {mode === 'chapters' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {chapters.map((ch) => {
                const isActive = browsingBook.id === selectedBook.id && ch === currentChapter;
                return (
                  <button
                    key={ch}
                    onClick={() => handleChapterClick(ch)}
                    style={{
                      height: 52, borderRadius: 16, border: 'none',
                      background: isActive ? 'linear-gradient(145deg, #fff7ed, #ffe9d3)' : T.solid,
                      color: isActive ? '#e8aa78' : T.text,
                      fontWeight: isActive ? 900 : 700, fontSize: '1.05rem',
                      boxShadow: isActive ? '0 4px 10px rgba(232, 170, 120, 0.25)' : T.soft,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease', WebkitTapHighlightColor: 'transparent', outline: 'none'
                    }}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {filteredBooks.map(book => {
                const isSelected = book.id === selectedBook.id;
                return (
                  <button
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    style={{
                      padding: '12px 4px', borderRadius: 16, border: isSelected ? 'none' : `1px solid ${T.line}`,
                      background: isSelected ? 'linear-gradient(145deg, #8d95d8, #7a82c2)' : T.solid,
                      color: isSelected ? '#fff' : T.text,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      cursor: 'pointer', transition: 'all 0.2s ease', WebkitTapHighlightColor: 'transparent', outline: 'none'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 900 }}>{book.name}</span>
                    <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 600 }}>{book.chapters}장</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  display: 'flex',
  alignItems: 'flex-end',
};

const backdropStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(4px)',
};

const sheetStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
  animation: 'slideUp 0.3s ease-out',
};
