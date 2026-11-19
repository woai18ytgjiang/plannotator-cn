/**
 * A plan's words, pure. On screen the page is "Spaces", one item "a plan"; its files are "Artifacts" (the home's own
 * words are in spacesModel.ts). A decision reads from the plan's decision record: "Approved" (with or without notes),
 * "Changes asked" (denied, or feedback sent; both local to this computer), or "No decision".
 */
import { isPlanPictureType, planMediaType, PLAN_PERSON, type PlanApprovalMoved, type PlanApprovalState, type PlanDecisionKind, type PlanVersion } from '@plannotator/core/plans';

export type PlanDecisionTone = 'approved' | 'changes' | 'none';

export function decisionTone(decision: PlanDecisionKind | null | undefined): PlanDecisionTone {
  if (decision === 'approved' || decision === 'approved-with-notes') return 'approved';
  if (decision === 'denied' || decision === 'feedback') return 'changes';
  return 'none';
}

export function decisionLabel(decision: PlanDecisionKind | null | undefined): string {
  if (decision === 'approved-with-notes') return '已批准（含备注）';
  const tone = decisionTone(decision);
  return tone === 'approved' ? '已批准' : tone === 'changes' ? '已请求修改' : '未决策';
}

// Approval "plans-editing": an approval belongs to the current version only. A new version holds none (unless the
// person's own edit carried theirs), and the page says so in one line; history keeps the past approval on its row.

/** "You" for the person on this computer, else the recorded name. */
export const approverName = (name: string) => (name === PLAN_PERSON ? '你' : name);

/** "You", "You and Dana", "You, Dana and Lee". */
export function approverList(names: readonly string[]): string {
  const shown = names.map(approverName);
  return shown.length <= 1 ? (shown[0] ?? '你') : `${shown.slice(0, -1).join('、')}和${shown[shown.length - 1]}`;
}

/** The newest version holds no approval: "v4 is new and not approved. You approved v3, and that does not carry over." */
export function approvalClearedLine(state: { version_number: number; from_version_number: number; names: readonly string[] }): string {
  return `v${state.version_number} 是新版本，尚未批准。${approverList(state.names)}批准的是 v${state.from_version_number}，不会延续到新版本。`;
}

/** The person's own edit carried their approval: "Your approval moved to v4." */
export function approvalMovedLine(moved: Pick<PlanApprovalMoved, 'name' | 'version_number'>): string {
  return moved.name === PLAN_PERSON ? `你的批准已转移到 v${moved.version_number}。` : `${moved.name} 的批准已转移到 v${moved.version_number}。`;
}

/** Where a plan's approval stands, in a few words (a list row, the rail head). Never an old approval as current. */
export function approvalWords(state: PlanApprovalState): string {
  switch (state.kind) {
    case 'approved':
      return state.notes ? '已批准（含备注）' : '已批准';
    case 'changes':
      return '已请求修改';
    case 'cleared':
      return `v${state.version_number} 是新版本，尚未批准`;
    case 'undecided':
      return `v${state.version_number} 尚未决策`;
    default:
      return '未决策';
  }
}

export function approvalTone(state: PlanApprovalState): PlanDecisionTone {
  return state.kind === 'approved' ? 'approved' : state.kind === 'changes' ? 'changes' : 'none';
}

/** A version's author as a display name only (never an email or a user id); null when none was recorded. */
export function authorOf(version: Pick<PlanVersion, 'author_label' | 'agent_name'>): string | null {
  return version.author_label?.trim() || version.agent_name?.trim() || null;
}

/**
 * A plan's left panel (the names agreed with Workspaces' space panel): "Pages" (the plan's documents, its main page
 * first and marked "Main"), then "Artifacts" (its other files) only when it has some.
 */
export const PLAN_FILES_WORDS = {
  panel: '文件',
  pages: '页面',
  artifacts: '产物',
  main: '主页',
  filter: '筛选文件',
  show: '显示文件',
  hide: '隐藏文件',
  back: '返回 Spaces',
  noPages: '没有页面',
  width: '文件栏宽度',
  noVersions: '产物没有版本：此文件按原样保留。',
} as const;

export const noFileMatches = (query: string) => `没有匹配「${query}」的文件。`;

export type PlanArtifactKind = 'image' | 'svg' | 'html' | 'pdf' | 'video' | 'other';

/**
 * What an artifact is, by its media type (an SVG is drawn as a picture, from its text). A picture only for the types
 * the server serves as pictures (`PLAN_PICTURE_TYPES`); another image type (BMP, TIFF, HEIC) is a file to download.
 */
export function artifactKind(contentType: string): PlanArtifactKind {
  const type = planMediaType(contentType);
  if (type === 'image/svg+xml') return 'svg';
  if (isPlanPictureType(type)) return 'image';
  if (type === 'text/html' || type === 'application/xhtml+xml') return 'html';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('video/')) return 'video';
  return 'other';
}

const ARTIFACT_KIND_WORDS: Record<PlanArtifactKind, string> = { image: '图片', svg: '图片（SVG）', html: 'HTML 页面', pdf: 'PDF', video: '视频', other: '文件' };
export const artifactKindLabel = (contentType: string) => ARTIFACT_KIND_WORDS[artifactKind(contentType)];

/** A file's size for a person: "820 bytes", "14 KB", "2.4 MB". */
export function sizeWords(bytes: number): string {
  if (bytes < 1000) return `${bytes} 字节`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** An artifact's name on screen: its title, else the last part of its path. */
export const artifactName = (artifact: { title: string | null; asset_path: string }) => artifact.title?.trim() || artifact.asset_path.split('/').pop()!;

/** Names in the order a person expects: case ignored, numbers as numbers ("v2" before "v10"). */
export const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
