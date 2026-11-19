/**
 * Bulk Merge on the Pull requests board (approval "inbox-pr-board-bulk": "merge the green ones and tell me about the
 * rest", a confirm before merging). Which of the picked PRs merge and why each of the others doesn't, in the words the
 * bar and the report show. Pure: SheetPage asks it, the tests table it.
 *
 * Green is the popover's own rule (`mergeOffered`) plus one for stacks: only the layer that lands next merges, since a
 * layer above another open layer would merge into that layer's branch, not its stack's base. The server still asks the
 * forge again, per PR, before it merges (`mergePull`).
 */
import { inboxPullIsOpen, inboxPullLabel, type InboxPull, type InboxPullStack } from '@plannotator/core/inbox-types';
import { forgeName } from '../pulls/labels';
import { leadLayer } from './tableModel';

/** Why a picked PR can't merge now, the words after "can't merge now: "; null when it can. */
export function cantMergeWhy(pull: InboxPull, stack: Pick<InboxPullStack, 'layers'> | null): string | null {
  if (pull.state === 'draft') return '它还是草稿';
  if (!inboxPullIsOpen(pull)) return null;
  const lead = stack ? leadLayer(stack) : pull;
  if (lead.key !== pull.key) return `它会在 ${inboxPullLabel(lead)} 之后落地`;
  if (pull.conflicts === true) return '它与基础分支冲突';
  if (pull.conflicts !== false) return `${forgeName(pull)} 尚未说明是否冲突`;
  if (pull.review === 'changes_requested') return '审查者请求了修改';
  if (pull.review === 'review_required') return '它还需要审查';
  if (pull.checks === 'failure') return '它的检查失败';
  if (pull.checks === 'pending') return '它的检查仍在运行';
  if (!pull.head_sha) return '它的最新提交未知';
  return null;
}

export interface MergePlan {
  /** The green ones, in the order given. */
  merge: InboxPull[];
  /** The rest, each with why. */
  skip: { pull: InboxPull; why: string }[];
}

/** The picked PRs (in the order on screen) split into what merges and what stays, each with its reason. */
export function mergePlan(picked: readonly InboxPull[], stackOf: (key: string) => Pick<InboxPullStack, 'layers'> | null): MergePlan {
  const plan: MergePlan = { merge: [], skip: [] };
  for (const pull of picked) {
    if (pull.state !== 'open' && pull.state !== 'draft') continue;
    const why = cantMergeWhy(pull, stackOf(pull.key));
    if (why) plan.skip.push({ pull, why });
    else plan.merge.push(pull);
  }
  return plan;
}

/** "#1190 can't merge now: its checks are failing." */
export function cantMergeLine(pull: InboxPull, why: string): string {
  return `${inboxPullLabel(pull)} 现在无法合并：${why}。`;
}

/** The bar's hint before Merge is pressed, or null when every pick can merge. */
export function mergeHint(plan: MergePlan): string | null {
  if (plan.skip.length === 0) return null;
  if (plan.merge.length > 0) return `${plan.skip.length} 个现在无法合并；已保持选中。`;
  if (plan.skip.length === 1) return cantMergeLine(plan.skip[0]!.pull, plan.skip[0]!.why);
  return '这些都无法合并。';
}

/** The confirm's words: the second click (a tap on a phone) merges this many, and a merge can't be taken back. */
export function confirmWords(count: number, phone: boolean): string {
  return phone
    ? `再次点击以合并 ${count} 个。合并无法撤销。`
    : `再次点击以合并 ${count} 个 PR。合并无法撤销。`;
}

/**
 * The confirm's one line for picks a linked machine merges (its gh / glab, its own sign-in there): which machine, per
 * machine. Null when this machine merges them all.
 */
export function farMergeLine(pulls: readonly InboxPull[], machines: Readonly<Record<string, { name?: string }>> | undefined): string | null {
  const byMachine = new Map<string, InboxPull[]>();
  for (const pull of pulls) if (pull.machine) byMachine.set(pull.machine, [...(byMachine.get(pull.machine) ?? []), pull]);
  if (byMachine.size === 0) return null;
  return [...byMachine].map(([id, list]) => `${machines?.[id]?.name ?? '另一台设备'} 会用它自己的登录合并 ${list.map(inboxPullLabel).join('、')}。`).join(' ');
}

/** A refusal in the forge's (or the Inbox's) own words, after the PR's number. */
export function refusedLine(pull: InboxPull, message: string): string {
  return `${inboxPullLabel(pull)} ${message}`;
}

/** A pick that was left out: "#1190 Not merged: its checks are failing." */
export function notMergedLine(pull: InboxPull, why: string): string {
  return `${inboxPullLabel(pull)} 未合并：${why}。`;
}
