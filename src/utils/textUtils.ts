export function decodeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/!&#x27;/g, "!"); // Specific fix for the user's screenshot
}
