/** Formats a line range as "Line 5" (single) or "Lines 5-12" (multi-line) */
export function formatLineRange(start: number, end: number): string {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  return lo === hi ? `第 ${lo} 行` : `第 ${lo}-${hi} 行`;
}

/** Formats a token selection as "Line 5: `token`" */
export function formatTokenContext(tokenSelection: {
  anchor: { lineNumber: number };
  fullText: string;
}): string {
  const display = tokenSelection.fullText.length > 30
    ? tokenSelection.fullText.slice(0, 27) + '...'
    : tokenSelection.fullText;
  return `第 ${tokenSelection.anchor.lineNumber} 行：\`${display}\``;
}
