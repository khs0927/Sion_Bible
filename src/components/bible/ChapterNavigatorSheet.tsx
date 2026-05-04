import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { KawaiiBibleIcon } from '../icons';

interface ChapterNavigatorSheetProps {
  open: boolean;
  onClose: () => void;
  bookName: string;
  currentChapter: number;
  totalChapters: number;
  onSelectChapter: (chapter: number) => void;
  T: any; // Theme object
}

export function ChapterNavigatorSheet({
  open,
  onClose,
  bookName,
  currentChapter,
  totalChapters,
  onSelectChapter,
  T,
}: ChapterNavigatorSheetProps) {
  if (!open) return null;

  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);
  const isPsalm = bookName === '시편';

  return (
    <div style={overlayStyle}>
      <div onClick={onClose} style={backdropStyle} />
      <div style={{ ...sheetStyle, background: T.panel, borderTop: `1px solid ${T.line}` }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: T.line, borderRadius: 2, margin: '12px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KawaiiBibleIcon size={16} framed={false} />
              <h2 className="title-font" style={{ fontSize: '1.25rem', fontWeight: 900, color: T.text }}>{bookName}</h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: T.sub, marginTop: 2, fontWeight: 600 }}>이동할 {isPsalm ? '편' : '장'}을 선택하세요</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.solid, border: `1px solid ${T.line}`, color: T.text, cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Grid */}
        <div style={{ padding: '0 16px 40px', maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {chapters.map((ch) => {
              const isActive = ch === currentChapter;
              return (
                <button
                  key={ch}
                  onClick={() => onSelectChapter(ch)}
                  aria-label={`${bookName} ${ch}${isPsalm ? '편' : '장'}으로 이동`}
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
