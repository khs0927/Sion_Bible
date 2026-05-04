import { useState, useMemo, type CSSProperties } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { KawaiiBibleIcon } from '../icons';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';
import { getSectionTheme, TESTAMENT_THEMES } from '../../services/bibleSectionTheme';

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

  // Grouped books for better navigation
  const groupedBooks = useMemo(() => {
    const groups: Record<string, { label: string; books: BibleBook[] }> = {};
    filteredBooks.forEach(book => {
      if (!groups[book.section]) {
        groups[book.section] = { label: book.sectionLabel, books: [] };
      }
      groups[book.section].books.push(book);
    });
    return Object.values(groups);
  }, [filteredBooks]);

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
                {view === 'books' && <KawaiiBibleIcon size={16} framed={false} />}
                <h2 className="title-font" style={{ fontSize: '1.25rem', fontWeight: 900, color: T.text }}>
                  {view === 'books' ? '성경 선택' : navBook.name}
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: T.sub, marginTop: 2, fontWeight: 600 }}>
                {view === 'books' ? '이동할 책을 선택하세요' : `이동할 ${isPsalm ? '편' : '장'}을 선택하세요`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
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
            {(['all', 'old', 'new'] as const).map(k => {
              const tabTheme = TESTAMENT_THEMES[k];
              const isActive = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: isActive ? `1px solid ${tabTheme.border}` : 'none',
                    background: isActive ? tabTheme.bg : T.solid,
                    color: isActive ? tabTheme.text : T.sub,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {k === 'all' ? '전체' : k === 'old' ? '구약' : '신약'}
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: '0 16px 40px', maxHeight: '60vh', overflowY: 'auto', minHeight: '30vh' }}>
          {view === 'books' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {groupedBooks.map(group => (
                <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: T.sub, paddingLeft: 4, opacity: 0.8 }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {group.books.map(book => {
                      const isSelected = book.id === navBook.id;
                      const sTheme = getSectionTheme(book.section);
                      return (
                        <button
                          key={book.id}
                          onClick={() => handleSelectBook(book)}
                          aria-label={`${book.name} 선택`}
                          style={{
                            minHeight: 52,
                            borderRadius: 14,
                            border: isSelected ? `2px solid ${T.accent}` : `1px solid ${sTheme.border}`,
                            background: sTheme.bg,
                            color: sTheme.text,
                            fontWeight: 900,
                            fontSize: '0.9rem',
                            boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : T.soft,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 4px',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 2 }}>{book.sectionLabel}</span>
                          {book.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
  animation: 'slideUp 0.3s ease-out',
};
