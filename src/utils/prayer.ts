export function ensureAmen(text: string) {
  const trimmed = text
    .trim()
    .replace(/우리 주 예수 그리스도의 이름으로 기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i, '')
    .replace(/예수님의 이름으로 기도합니다[.!?。．…]*\s*아멘[.!?。．…]*$/i, '')
    .replace(/예수님의 이름으로 기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i, '')
    .replace(/예수 그리스도의 이름으로 기도합니다[.!?。．…]*\s*아멘[.!?。．…]*$/i, '')
    .replace(/예수 그리스도의 이름으로 기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i, '')
    .replace(/아멘[.!?。．…]*$/i, '')
    .trim();
  if (!trimmed) return trimmed;

  return `${trimmed.replace(/[.!?。．…]+$/, '')}.\n우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.`;
}
