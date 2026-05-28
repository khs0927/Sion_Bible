import type { BibleVerseRecord } from '../types/bible';

let bibleIndex: BibleVerseRecord[] | null = null;
let isFullIndexLoading = false;

export async function loadBibleVerseIndex(): Promise<BibleVerseRecord[]> {
  if (bibleIndex) return bibleIndex;
  if (isFullIndexLoading) {
    while (isFullIndexLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return bibleIndex || [];
  }

  isFullIndexLoading = true;
  try {
    const response = await fetch('/bible/korean-bible-index.json');
    if (!response.ok) throw new Error('Failed to load bible index');
    const data = await response.json();
    bibleIndex = data as BibleVerseRecord[];
    
    // Validate the index is substantial without assuming a specific source edition.
    if (bibleIndex.length < 30000) {
      console.warn(`Unexpected bible verse count: ${bibleIndex.length}.`);
    }
    
    return bibleIndex;
  } catch (error) {
    console.error('Error loading bible index:', error);
    return [];
  } finally {
    isFullIndexLoading = false;
  }
}

export async function getBibleIndexMeta() {
  try {
    const response = await fetch('/bible/korean-bible-meta.json');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function getCachedBibleIndex(): BibleVerseRecord[] | null {
  return bibleIndex;
}

export function clearBibleIndexCache() {
  bibleIndex = null;
}
