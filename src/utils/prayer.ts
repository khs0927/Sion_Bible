export function ensureAmen(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/아멘[.!?。．…]*$/i.test(trimmed)) return trimmed;

  return `${trimmed.replace(/[.!?。．…]+$/, '')} 아멘.`;
}
