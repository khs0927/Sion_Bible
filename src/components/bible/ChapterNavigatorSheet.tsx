import { useState, useMemo, type CSSProperties } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { KawaiiBibleIcon } from '../icons';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';

interface ChapterNavigatorSheetProps {
  open: boolean;
  onClose: () => void;
  currentBookId: string;
  currentBookName: string;
  currentChapter: number;
  onSelectChapter: (params: { bookId: string; bookName: string; chapter: number }) => void;
  T: any; // Theme object
}

type NavigatorView = 'chapters' | 'books';
type TestamentFilter = 'all' | 'old' | 'new';

export function ChapterNavigatorSheet({
  open,
  onClose,
  currentBookId,
  currentBookName,
  currentChapter,
  onSelectChapter,
  T,
}: ChapterNavigatorSheetProps) {
  const [view, setView] = useState<NavigatorView>('chapters');
  const [filter, setFilter] = useState<TestamentFilter>('all');
  
  // Internal selection state (for navigation within the sheet)
  const initialBook = useMemo(() => BIBLE_BOOKS.find(b => b.id === currentBookId) || BIBLE_BOOKS[0], [currentBookId]);
  const [navBook, setNavBook] = useState<BibleBook>(initialBook);

  if (!open) return null;

  const filteredBooks = BIBLE_BOOKS.filter(b => {
    if (filter === 'all') return true;
    return b.testament === filter;
  });

  const isPsalm = navBook.name === '시편';
  const chapters = Array.from({ length: navBook.chapters }, (_, i) => i + 1);

  const handleSelectBook = (book: BibleBook) => {
    setNavBook(book);
    setView('chapters');
  };

  const handleSelectChapter = (ch: number) => {
    onSelectChapter({
      bookId: navBook.id,
      bookName: navBook.name,
      chapter: ch,
    });
    onClose();
    // Reset view for next open
    setTimeout(() => setView('chapters'), 300);
  };

  const handleClose = () => {
    onClose();
    // Small delay to prevent visual jump before animation finishes
    setTimeout(() => {
      setNavBook(initialBook);
      setView('chapters');
    }, 300);
  };

  return (
    <div style={overlayStyle}>
      <div onClick={handleClose} style={backdropStyle} />
      <div style={{ ...sheetStyle, background: T.panel, borderTop: `1px solid ${T.line}` }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: T.line, borderRadius: 2, margin: '12px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {view === 'chapters' && (
              <button
                onClick={() => setView('books')}
                aria-label="성경책 목록으로 돌아가기"
                style={{
                  width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: T.solid, border: `1px solid ${T.line}`, color: T.text, cursor: 'pointer'
                }}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {view === 'books' && <KawaiiBibleIcon size={16} />}
                <h2 className="title-font" style={{ fontSize: '1.25rem', fontWeight: 900, color: T.text }}>
                  {view === 'books' ? '성경 선택' : navBook.name}
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: T.sub, marginTop: 2, fontWeight: 600 }}>
                {view === 'books' ? `${currentBookName}에서 이동할 책을 선택하세요` : `이동할 ${isPsalm ? '편' : '장'}을 선택하세요`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            aria-label="장 선택 닫기"
            style={{ 
              width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.solid, border: `1px solid ${T.line}`, color: T.text, cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs for Books view */}
        {view === 'books' && (
          <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
            {(['all', 'old', 'new'] as const).map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  border: 'none',
                  background: filter === k ? T.pill : T.solid,
                  color: filter === k ? T.accent : T.sub,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {k === 'all' ? '전체' : k === 'old' ? '구약' : '신약'}
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: '0 16px 40px', maxHeight: '60vh', overflowY: 'auto', minHeight: '30vh' }}>
          {view === 'books' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {filteredBooks.map(book => {
                const isSelected = book.id === navBook.id;
                return (
                  <button
                    key={book.id}
                    onClick={() => handleSelectBook(book)}
                    aria-label={`${book.name} 선택`}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: 'none',
                      background: isSelected ? 'linear-gradient(145deg, #fff7ed, #ffe9d3)' : T.solid,
                      color: isSelected ? '#e8aa78' : T.text,
                      fontWeight: isSelected ? 900 : 700,
                      fontSize: '0.9rem',
                      boxShadow: isSelected ? '0 4px 10px rgba(232, 170, 120, 0.15)' : T.soft,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {book.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {chapters.map((ch) => {
                const isActive = navBook.id === currentBookId && ch === currentChapter;
                return (
                  <button
                    key={ch}
                    onClick={() => handleSelectChapter(ch)}
                    aria-label={`${navBook.name} ${ch}${isPsalm ? '편' : '장'}으로 이동`}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      height: 52,
                      borderRadius: 16,
                      border: 'none',
                      background: isActive ? 'linear-gradient(145deg, #fff7ed, #ffe9d3)' : T.solid,
                      color: isActive ? '#e8aa78' : T.text,
                      fontWeight: isActive ? 900 : 700,
                      fontSize: '1.05rem',
                      boxShadow: isActive ? '0 4px 10px rgba(232, 170, 120, 0.25)' : T.soft,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      WebkitTapHighlightColor: 'transparent',
                      outline: 'none',
                    }}
                  >
                    {ch}
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
  zIndex: 200,
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
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  boxShadow: '0 -18px 40px rgba(0,0,0,0.14)',
  animation: 'slideUp 0.3s ease-out',
};
