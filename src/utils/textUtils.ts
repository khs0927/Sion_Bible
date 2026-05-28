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

export function sanitizeScriptureText(text: string) {
  const cleaned = decodeHtml(text)
    .replace(/[“”"']/g, '')
    .replace(/[!?！？]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Insert a newline immediately after angle brackets (e.g., <천지 창조> -> <천지 창조>\n)
  return cleaned.replace(/(<[^>]+>)\s*/g, '$1\n');
}
