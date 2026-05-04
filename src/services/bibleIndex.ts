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
    
    // Validate verse count
    if (bibleIndex.length !== 31102 && bibleIndex.length !== 30929) {
      console.warn(`Unexpected bible verse count: ${bibleIndex.length}. Standard Protestant Bible usually has 31,102 verses.`);
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
