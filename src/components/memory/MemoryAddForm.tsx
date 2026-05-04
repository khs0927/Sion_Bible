import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BIBLE_VERSES } from '../../data/verses';

type ThemeTokens = Record<string, string>;
type SavedVerseLike = { ref: string; text: string };

export function MemoryAddForm({
  T,
  savedVerses,
  onAdd,
}: {
  T: ThemeTokens;
  savedVerses: SavedVerseLike[];
  onAdd: (input: { ref: string; text: string; note?: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [addedRef, setAddedRef] = useState('');

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return BIBLE_VERSES.filter((verse) => {
      const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
      return ref.includes(trimmed) || verse.content.includes(trimmed) || verse.category.includes(trimmed);
    }).slice(0, 8);
  }, [query]);

  const addVerse = (ref: string, text: string) => {
    onAdd({ ref, text, note });
    setAddedRef(ref);
    setNote('');
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 16, border: `1px solid ${T.line}`, background: T.solid, padding: '9px 11px' }}>
          <Search size={15} color={T.sub} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="본문 검색: 사랑, 요한복음 3:16" style={{ border: 0, outline: 0, background: 'transparent', color: T.text, flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: 13 }} />
        </div>
        <input value={note} onChange={event => setNote(event.target.value)} placeholder="암송 메모 선택" style={input(T)} />
        <div style={{ display: 'grid', gap: 7 }}>
          {query.trim() && searchResults.length === 0 && <div style={{ color: T.sub, fontSize: 13 }}>검색 결과가 없습니다. 저장된 말씀에서 가져오거나 다른 단어로 검색해보세요.</div>}
          {searchResults.map((verse) => {
            const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
            return (
              <button key={ref} onClick={() => addVerse(ref, verse.content)} style={resultCard(T, addedRef === ref)}>
                <span style={{ color: T.accent, fontWeight: 900, fontSize: 12 }}>{ref}</span>
                <span style={{ display: 'block', marginTop: 5, lineHeight: 1.65, fontSize: 13 }}>"{verse.content}"</span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ display: 'grid', gap: 7 }}>
        <div className="title-font" style={{ fontSize: 17, fontWeight: 800 }}>저장된 말씀 가져오기</div>
        {savedVerses.length === 0 && <div style={{ color: T.sub, fontSize: 13 }}>저장된 말씀이 아직 없습니다.</div>}
        {savedVerses.slice(0, 8).map((verse) => (
          <button key={verse.ref} onClick={() => addVerse(verse.ref, verse.text)} style={resultCard(T, addedRef === verse.ref)}>
            <span style={{ color: T.accent, fontWeight: 900, fontSize: 12 }}>{verse.ref}</span>
            <span style={{ display: 'block', marginTop: 5, lineHeight: 1.65, fontSize: 13 }}>"{verse.text}"</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function input(T: ThemeTokens) {
  return { width: '100%', borderRadius: 15, border: `1px solid ${T.line}`, background: T.solid, color: T.text, padding: '11px 12px', fontFamily: 'inherit', outline: 'none', fontSize: 13 };
}

function resultCard(T: ThemeTokens, active: boolean) {
  return {
    textAlign: 'left' as const,
    borderRadius: 16,
    border: `1px solid ${active ? T.accent : T.line}`,
    background: active ? `linear-gradient(145deg, ${T.butter}, ${T.peach})` : T.solid,
    color: T.text,
    padding: 11,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: T.soft,
  };
}
