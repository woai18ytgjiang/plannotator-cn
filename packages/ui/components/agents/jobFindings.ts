// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
export interface FindingLike {
  id?: string;
  source?: string;
  severity?: string;
  text?: string;
  filePath?: string;
  lineStart?: number;
}

const RANKS: Array<{ key: string; word: string }> = [
  { key: 'important', word: '重要' },
  { key: 'P0', word: 'P0' },
  { key: 'P1', word: 'P1' },
  { key: 'P2', word: 'P2' },
  { key: 'P3', word: 'P3' },
  { key: 'nit', word: '细节' },
  { key: 'pre_existing', word: '原有问题' },
  { key: 'other', word: '其他' },
];
const RANK_INDEX = new Map(RANKS.map((r, i) => [r.key, i]));

export function findingRank(finding: FindingLike): string {
  if (finding.severity && RANK_INDEX.has(finding.severity)) return finding.severity;
  const priority = /^\s*\[P([0-3])\]/.exec(finding.text ?? '');
  return priority ? `P${priority[1]}` : 'other';
}

export function findingsOf<T extends FindingLike>(source: string, annotations: readonly T[]): T[] {
  return annotations
    .filter((a) => a.source === source)
    .sort((a, b) => {
      const ra = RANK_INDEX.get(findingRank(a)) ?? RANKS.length;
      const rb = RANK_INDEX.get(findingRank(b)) ?? RANKS.length;
      if (ra !== rb) return ra - rb;
      if (!!a.filePath !== !!b.filePath) return a.filePath ? -1 : 1;
      return (a.filePath ?? '').localeCompare(b.filePath ?? '') || (a.lineStart ?? 0) - (b.lineStart ?? 0);
    });
}

export function findingCountsLine(findings: readonly FindingLike[]): string {
  if (findings.length === 0) return '未发现问题';
  const counts = new Map<string, number>();
  for (const f of findings) counts.set(findingRank(f), (counts.get(findingRank(f)) ?? 0) + 1);
  if (counts.size === 1 && counts.has('other')) return `${findings.length} 个发现`;
  return RANKS.filter((r) => counts.has(r.key))
    .map((r) => `${counts.get(r.key)} 个${r.word}`)
    .join(' · ');
}
