// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * Copy for a review the agent closed (`POST /api/host/close`,
 * packages/shared/host-control.ts). The tab learns it from the
 * `session-closed` event on the external-annotation stream.
 *
 * The close keeps the draft; what brings it back depends on the draft's key,
 * so the copy names the case:
 *  - `file` / `folder`: a local file's draft follows its PATH as well as its
 *    text (packages/shared/annotate-draft.ts), so it comes back even after
 *    the file was edited. A folder's files each carry their own copy.
 *  - `document`: a URL or an agent message is keyed by its content only, so
 *    only the same, unchanged document brings it back.
 *  - `app`: a live app is keyed by its address.
 *  - `changes`: code review, keyed by the patch (or the PR).
 */

export const AGENT_CLOSED_TITLE = '智能体已关闭';

export type AgentClosedSurface = 'file' | 'folder' | 'document' | 'app' | 'changes';

const RESTORE: Record<AgentClosedSurface, string> = {
  file: '再次打开该文件即可恢复，即使文件已被编辑。',
  folder: '再次打开该文件夹或其中的文件即可恢复，即使它们已被编辑。',
  document: '重新打开同一份未改动的文档即可恢复。',
  app: '再次打开同一个应用即可恢复。',
  changes: '重新打开同一批更改的审查即可恢复。',
};

export function agentClosedSubtitle(unsentAnnotations: number, surface: AgentClosedSurface = 'document'): string {
  if (unsentAnnotations <= 0) return '智能体已关闭此审查。';
  const comments = unsentAnnotations === 1 ? '你的评论已保存为草稿。' : `你的 ${unsentAnnotations} 条评论已保存为草稿。`;
  return `智能体已关闭此审查。${comments} ${RESTORE[surface]}`;
}

/**
 * Copy for a plan review closed because plan mode or the agent session ended
 * (`session-closed` with `by: "session"`, Pi's plan review), not because the
 * agent asked to close it. Neutral on purpose: it also runs on /reload and
 * session switches, after which plan mode may come back.
 */
export const SESSION_CLOSED_TITLE = '审查已关闭';

export function sessionClosedSubtitle(unsentAnnotations: number): string {
  const ended = '打开此计划评审的智能体会话已结束。';
  if (unsentAnnotations <= 0) return ended;
  const comments = unsentAnnotations === 1 ? '你的评论已保存。' : `你的 ${unsentAnnotations} 条评论已保存。`;
  return `${ended} ${comments}`;
}

/** Title and subtitle for a closed review, by who closed it. */
export function closedReviewCopy(
  closed: { unsentAnnotations: number; by?: 'agent' | 'session' },
  surface: AgentClosedSurface = 'document',
): { title: string; subtitle: string } {
  if (closed.by === 'session') {
    return { title: SESSION_CLOSED_TITLE, subtitle: sessionClosedSubtitle(closed.unsentAnnotations) };
  }
  return { title: AGENT_CLOSED_TITLE, subtitle: agentClosedSubtitle(closed.unsentAnnotations, surface) };
}
