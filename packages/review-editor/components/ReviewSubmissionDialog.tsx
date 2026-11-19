import React, { useRef } from 'react';
import type { CodeAnnotation } from '@plannotator/ui/types';
import { getPRPlatformCapabilities, type Platform, type PRReviewAction, type PRReviewFileLevelComment, type PRReviewSubmissionPartial } from '@plannotator/shared/pr-types';
import { CopyButton } from './CopyButton';
import {
  exportReviewFeedback,
  formatCallFlowAnnotationTargets,
  markdownPreviewQuote,
  formatConventionalPrefix,
  OUTDATED_ANNOTATION_LABEL,
} from '../utils/exportFeedback';
import { useCompactTouchLayout } from '@plannotator/ui/hooks/useIsMobile';
import { canPostInline } from '@plannotator/ui/utils/codeAnnotationAnchor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@plannotator/ui/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionTarget {
  prUrl: string;
  prNumber: number;
  prTitle: string;
  prRepo: string;
  fileComments: Array<{
    path: string;
    line: number;
    side: 'LEFT' | 'RIGHT';
    body: string;
    start_line?: number;
    start_side?: 'LEFT' | 'RIGHT';
  }>;
  /** GitHub only (#1599): file-scoped comments posted as file-level threads.
   *  On any other platform they stay in `fileScopedBody`. */
  fileLevelComments: PRReviewFileLevelComment[];
  fileScopedBody: string;
  fileCount: number;
  annotationCount: number;
  /** Comments on lines outside the diff, posted in the review body (with code and a link). */
  outsideDiffCount?: number;
  status: 'pending' | 'success' | 'partial' | 'failed' | 'blocked';
  error?: string;
  partial?: PRReviewSubmissionPartial;
}

export interface OrphanedFindings {
  reason: 'full-stack' | 'unmapped';
  annotations: CodeAnnotation[];
  markdown: string;
}

export interface ReviewSubmission {
  targets: SubmissionTarget[];
  orphans: OrphanedFindings[];
}

/** Request body accepted by the review server's platform submission endpoint. */
export interface PRActionRequest {
  action: PRReviewAction;
  body: string;
  fileComments: SubmissionTarget['fileComments'];
  fileLevelComments?: PRReviewFileLevelComment[];
  targetPrUrl?: string;
}

type ReviewPlatform = Platform;

interface ReviewSubmissionDialogProps {
  isOpen: boolean;
  action: PRReviewAction;
  /**
   * #1611: when given (and the dialog is not approving), the dialog offers a
   * Comment / Request changes choice and reports the pick here. The primary
   * "Post Comments" opens without it, so that flow is unchanged.
   */
  onActionChange?: (action: 'comment' | 'request_changes') => void;
  /**
   * Why Request changes cannot be chosen (the platform has no such review, or
   * refuses it on your own PR). Set ⇒ the option renders disabled with this
   * reason under it.
   */
  requestChangesUnavailableReason?: string;
  submission: ReviewSubmission;
  generalComment: string;
  onGeneralCommentChange: (value: string) => void;
  platformOpenPR: boolean;
  onPlatformOpenPRChange: (value: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  recoveryPersistsRefresh: boolean;
  mrLabel: string;
  platformLabel: string;
  /** The PR this goes on, when no comment target names it (the Inbox's Post). */
  postingTo?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A line comment posted in the review body instead of inline: outdated (#1590),
// or stamped on a snapshot the session knows its PR has moved past.
const inBody = (a: CodeAnnotation, withheld: ReadonlySet<string>) => a.outdated || a.outsideDiff === true || withheld.has(a.id);

/** A link to a file's lines at the PR's head commit (`prBlobPermalink`). */
/** A link to lines at the PR head the comment was made on (its own PR in a stack). */
export type ReviewPermalink = (path: string, lineStart: number, lineEnd: number, annotation?: CodeAnnotation) => string | undefined;

/** Most lines of code quoted for one comment outside the diff; the permalink shows the rest. */
export const OUTSIDE_DIFF_QUOTE_MAX_LINES = 40;

function capQuotedCode(code: string): string {
  const lines = code.split('\n');
  if (lines.length <= OUTSIDE_DIFF_QUOTE_MAX_LINES) return code;
  return `${lines.slice(0, OUTSIDE_DIFF_QUOTE_MAX_LINES).join('\n')}\n…`;
}

/** The heading of the review body's section for comments on lines outside the diff. */
export const OUTSIDE_DIFF_BODY_HEADING = '差异之外的评论';

function codeFence(code: string): string {
  const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}\n${code}\n${fence}`;
}

/**
 * Comments on lines outside the PR's diff: no platform takes them inline, and
 * a file outside the PR cannot take a file-level comment either, so each goes
 * in the review body with the code it was written on and a link to those
 * lines at the head commit.
 */
function buildOutsideDiffSection(annotations: CodeAnnotation[], permalink?: ReviewPermalink): string {
  const entries = annotations
    .filter((a) => a.outsideDiff && (a.scope ?? 'line') === 'line' && (a.text || a.suggestedCode))
    .map((a) => {
      // The link opens the head commit: an old side's line number is not that line there, so it goes unlinked and says its side.
      const oldSide = a.side === 'old';
      const lines = `${a.lineStart === a.lineEnd ? `L${a.lineStart}` : `L${a.lineStart}-L${a.lineEnd}`}${oldSide ? '，旧侧' : ''}`;
      const link = oldSide ? undefined : permalink?.(a.filePath, a.lineStart, a.lineEnd, a);
      const where = link ? `[${a.filePath} (${lines})](${link})` : `${a.filePath} (${lines})`;
      const code = a.anchorText ?? a.originalCode;
      // Capped (GitHub refuses a review body over 65,536 characters); the
      // permalink covers the rest.
      const quoted = code ? `\n\n${codeFence(capQuotedCode(code))}` : '';
      const suggestion = a.suggestedCode ? `\n\n建议代码：\n${codeFence(a.suggestedCode)}` : '';
      const prefix = formatConventionalPrefix(a.conventionalLabel, a.decorations);
      return `**${where}:** ${prefix}${a.text ?? ''}${quoted}${suggestion}`.trim();
    });
  if (entries.length === 0) return '';
  return `**${OUTSIDE_DIFF_BODY_HEADING}**\n\n${entries.join('\n\n')}`;
}

function buildAnnotationFileComments(
  annotations: CodeAnnotation[],
  withheld: ReadonlySet<string>,
): SubmissionTarget['fileComments'] {
  return annotations
    // Outdated comments (#1590) carry line numbers from an earlier version of
    // the PR; posting them inline would pin them to whatever code sits there
    // now. They ride the review body instead (buildFileScopedBody).
    .filter(a => (a.scope ?? 'line') === 'line' && !inBody(a, withheld))
    .map(ann => {
      const ccPrefix = formatConventionalPrefix(ann.conventionalLabel, ann.decorations);
      let body = ccPrefix + (ann.text ?? '');
      body += formatCallFlowAnnotationTargets(ann);
      if (ann.suggestedCode) {
        body += `\n\n\`\`\`suggestion\n${ann.suggestedCode}\n\`\`\``;
      }
      const side = (ann.side === 'old' ? 'LEFT' : 'RIGHT') as 'LEFT' | 'RIGHT';
      const isMultiLine = ann.lineStart != null && ann.lineEnd != null && ann.lineStart !== ann.lineEnd;
      return {
        path: ann.filePath,
        line: ann.lineEnd ?? ann.lineStart,
        side,
        body: body.trim(),
        ...(isMultiLine && { start_line: ann.lineStart, start_side: side }),
      };
    })
    .filter(c => c.body.length > 0);
}

// File-scoped comments posted as GitHub file-level review threads (#1599). The
// body is the same text the review body fold uses, minus the path prefix.
function buildFileLevelComments(annotations: CodeAnnotation[]): PRReviewFileLevelComment[] {
  return annotations
    // A comment made in a Markdown preview quotes rendered text, not lines:
    // it always rides the review body (see buildFileScopedBody).
    .filter(a => a.scope === 'file' && !a.markdownPreview)
    .map(a => ({ path: a.filePath, body: `${a.text ?? ''}${formatCallFlowAnnotationTargets(a)}`.trim() }))
    .filter(c => c.path.length > 0 && c.body.length > 0);
}

// The review-level body: file-scoped comments (prefixed with their path) plus
// general (review-wide) comments, which belong to no file. Both ride here so
// neither is dropped from a PR submission. With `fileLevel` (GitHub), file-scoped
// comments post as file-level threads instead and are left out of the body.
function buildFileScopedBody(annotations: CodeAnnotation[], withheld: ReadonlySet<string>, fileLevel: boolean, permalink?: ReviewPermalink): string {
  const parts: string[] = [];
  for (const a of annotations) {
    const scope = a.scope ?? 'line';
    if (a.outsideDiff && scope === 'line') continue; // its own section below
    const callFlowContext = formatCallFlowAnnotationTargets(a);
    if (scope === 'file' && a.markdownPreview && a.text) {
      // Never inline and never a file-level thread: the quote is rendered
      // text, which maps to no line the platform could anchor to.
      parts.push(`**${a.filePath}（渲染后的 Markdown）：**\n\n${markdownPreviewQuote(a.markdownPreview)}\n${a.text}`.trim());
    } else if (scope === 'file' && !fileLevel && (a.text || callFlowContext)) {
      parts.push(`**${a.filePath}:** ${a.text ?? ''}${callFlowContext}`.trim());
    } else if (scope === 'general' && (a.text || callFlowContext)) {
      parts.push(`${a.text ?? ''}${callFlowContext}`.trim());
    } else if (scope === 'line' && inBody(a, withheld) && (a.text || a.suggestedCode || callFlowContext)) {
      const lines = a.lineStart === a.lineEnd ? `L${a.lineStart}` : `L${a.lineStart}-L${a.lineEnd}`;
      const suggestion = a.suggestedCode ? `\n\n建议代码：\n\`\`\`\n${a.suggestedCode}\n\`\`\`` : '';
      // The code the comment was written on, so the PR reader can find it
      // even though the line numbers no longer point there.
      const commentedOn = a.anchorText !== undefined ? `\n\n针对的代码：\n\`\`\`\n${a.anchorText}\n\`\`\`` : '';
      // The Outdated label only for a comment an anchor check marked outdated.
      const label = a.outdated ? `${OUTDATED_ANNOTATION_LABEL} ` : '';
      parts.push(
        `**${a.filePath} (${lines}, ${a.side}):** ${label}${a.text ?? ''}${callFlowContext}${commentedOn}${suggestion}`.trim(),
      );
    }
  }
  const outside = buildOutsideDiffSection(annotations, permalink);
  if (outside) parts.push(outside);
  return parts.join('\n\n');
}

function buildFailedCommentsMarkdown(
  partial: PRReviewSubmissionPartial,
): string {
  return partial.failedFileComments
    .map(({ comment, error }) => [
      `### ${comment.path}:${comment.line}`,
      comment.body,
      '',
      `发布错误：${error}`,
    ].join('\n'))
    .join('\n\n');
}

/**
 * Build the top-level review body without adding product attribution.
 * GitHub requires a body for COMMENT and REQUEST_CHANGES reviews, so an inline-only review gets a
 * neutral pointer. Approvals and GitLab discussions can remain bodyless.
 */
/** What a narrowed retry will send, for the partial-submission notice. */
export function describePartialRetry(partial: PRReviewSubmissionPartial, mrLabel: string): string {
  const { retry } = partial;
  const parts: string[] = [];
  if (retry.fileComments.length > 0) {
    parts.push(`${retry.fileComments.length} 条未发布的行内评论`);
  }
  if (retry.body !== undefined) parts.push('未发布的通用评论');
  if (partial.approval === 'failed') parts.push(`${mrLabel} 决策`);
  const what = parts.length > 1
    ? `${parts.slice(0, -1).join('、')}和 ${parts[parts.length - 1]}`
    : parts[0] ?? '无内容';
  const notAgain = retry.body !== undefined
    ? '已发布的评论不会被重复发送。'
    : '已发布的评论和通用备注不会被重复发送。';
  return `重试只会发送 ${what}；${notAgain}`;
}

export function buildPlatformReviewBody(
  action: PRReviewAction,
  platform: ReviewPlatform,
  generalComment: string | undefined,
  target: Pick<SubmissionTarget, 'fileComments' | 'fileScopedBody'> & Partial<Pick<SubmissionTarget, 'fileLevelComments'>>,
): string {
  const parts: string[] = [];
  if (generalComment?.trim()) parts.push(generalComment);
  if (target.fileScopedBody.trim()) parts.push(target.fileScopedBody);

  if (parts.length > 0) return parts.join('\n\n');
  const threadCount = target.fileComments.length + (target.fileLevelComments?.length ?? 0);
  // GitHub requires a body on COMMENT and REQUEST_CHANGES reviews alike.
  if (action !== 'approve' && getPRPlatformCapabilities({ platform }).reviewBodyRequired && threadCount > 0) {
    return '详见行内评论。';
  }
  return '';
}

/**
 * Build either the original platform request or the exact retry-safe subset
 * returned by the server after a partial GitLab submission.
 */
export function buildPRActionRequest(
  action: PRReviewAction,
  body: string,
  target: SubmissionTarget,
): PRActionRequest {
  if (target.status === 'partial' && !target.partial) {
    throw new Error('Partial review target is missing its server-authorized retry');
  }
  const retry = target.partial?.retry;
  // A narrowed retry (GitLab/Bitbucket partial) resends only its own inline
  // comments, plus the general comment when the server reports it unposted.
  const fileLevelComments = retry ? [] : target.fileLevelComments;
  return {
    action: retry?.action ?? action,
    body: retry ? (retry.body ?? '') : body,
    fileComments: retry?.fileComments ?? target.fileComments,
    ...(fileLevelComments.length > 0 ? { fileLevelComments } : {}),
    ...(target.prUrl ? { targetPrUrl: target.prUrl } : {}),
  };
}

export function buildReviewSubmission(
  allAnnotations: CodeAnnotation[],
  editorAnnotations: Array<{ filePath: string; lineStart: number; lineEnd: number; comment?: string; selectedText?: string }>,
  currentPrUrl: string | undefined,
  currentDiffPaths: Set<string>,
  currentPrMeta?: { number: number; title: string; repo: string },
  /** PR url → snapshot id of the diff last seen for that PR's layer view
   *  (#1590). When given, a line comment is posted inline only if its
   *  `anchorSnapshot` equals that snapshot; anything else (outdated, or
   *  coordinates from a diff we cannot vouch for) goes in the review body. */
  knownSnapshots?: ReadonlyMap<string, string>,
  /** Target platform. Only platforms with the `fileLevelComments` capability
   *  (GitHub) post file-scoped comments as file-level
   *  threads (#1599); anything else folds them into the review body. */
  platform?: ReviewPlatform,
  /** Links a comment outside the diff to its lines at the head commit. */
  permalink?: ReviewPermalink,
): ReviewSubmission {
  const fileLevel = platform !== undefined && getPRPlatformCapabilities({ platform }).fileLevelComments;
  const targets: SubmissionTarget[] = [];
  const orphanAnnotations: { reason: 'full-stack' | 'unmapped'; ann: CodeAnnotation }[] = [];

  // Separate postable (layer) from orphaned (full-stack)
  const layerAnnotations: CodeAnnotation[] = [];
  for (const ann of allAnnotations) {
    if (ann.diffScope === 'full-stack') {
      orphanAnnotations.push({ reason: 'full-stack', ann });
    } else {
      layerAnnotations.push(ann);
    }
  }

  // Group layer annotations by prUrl
  const byPR = new Map<string, CodeAnnotation[]>();
  const hasMultiplePRs = new Set(layerAnnotations.map(a => a.prUrl).filter(Boolean)).size > 1;

  for (const ann of layerAnnotations) {
    const key = ann.prUrl ?? currentPrUrl ?? '_current';
    if (!ann.prUrl && hasMultiplePRs) {
      orphanAnnotations.push({ reason: 'unmapped', ann });
      continue;
    }
    const group = byPR.get(key) || [];
    group.push(ann);
    byPR.set(key, group);
  }

  // Build editor file comments (always attached to the current PR)
  const editorFileComments: SubmissionTarget['fileComments'] = [];
  const editorFiles = new Set<string>();
  if (editorAnnotations.length > 0) {
    for (const ea of editorAnnotations) {
      if (!currentDiffPaths.has(ea.filePath)) continue;
      const body = ea.comment
        ? `> ${ea.selectedText}\n\n${ea.comment}`
        : `> ${ea.selectedText}`;
      if (!body.trim()) continue;
      const isMultiLine = ea.lineStart !== ea.lineEnd;
      editorFileComments.push({
        path: ea.filePath,
        line: ea.lineEnd,
        side: 'RIGHT' as const,
        body,
        ...(isMultiLine && { start_line: ea.lineStart, start_side: 'RIGHT' as const }),
      });
      editorFiles.add(ea.filePath);
    }
  }

  // Build targets from PR groups
  const currentKey = currentPrUrl ?? '_current';
  let editorCommentsAttached = false;

  for (const [prUrl, annotations] of byPR) {
    const withheld = new Set(
      annotations
        .filter((ann) => (ann.scope ?? 'line') === 'line' && !ann.outdated && !canPostInline(ann, knownSnapshots, currentPrUrl))
        .map((ann) => ann.id),
    );
    const sample = annotations[0];
    const fileComments = buildAnnotationFileComments(annotations, withheld);
    const fileLevelComments = fileLevel ? buildFileLevelComments(annotations) : [];
    const fileScopedBody = buildFileScopedBody(annotations, withheld, fileLevel, permalink);
    const outsideDiffCount = annotations.filter((a) => a.outsideDiff && (a.scope ?? 'line') === 'line').length;
    // Exclude the "" sentinel path of general (review-level) comments so they
    // don't inflate the file count.
    const uniqueFiles = new Set(annotations.map(a => a.filePath).filter(p => p.length > 0));

    if (prUrl === currentKey && editorFileComments.length > 0) {
      fileComments.push(...editorFileComments);
      for (const f of editorFiles) uniqueFiles.add(f);
      editorCommentsAttached = true;
    }

    targets.push({
      prUrl: prUrl === '_current' ? (currentPrUrl ?? '') : prUrl,
      prNumber: sample.prNumber ?? 0,
      prTitle: sample.prTitle ?? '',
      prRepo: sample.prRepo ?? '',
      fileComments,
      fileLevelComments,
      fileScopedBody,
      fileCount: uniqueFiles.size,
      annotationCount: annotations.length,
      ...(outsideDiffCount > 0 ? { outsideDiffCount } : {}),
      status: 'pending',
    });
  }

  // Editor-only case: no regular annotations but has editor annotations
  if (!editorCommentsAttached && editorFileComments.length > 0) {
    targets.push({
      prUrl: currentPrUrl ?? '',
      prNumber: currentPrMeta?.number ?? 0,
      prTitle: currentPrMeta?.title ?? '',
      prRepo: currentPrMeta?.repo ?? '',
      fileComments: editorFileComments,
      fileLevelComments: [],
      fileScopedBody: '',
      fileCount: editorFiles.size,
      annotationCount: 0,
      status: 'pending',
    });
  }

  // Build orphan groups
  const orphans: OrphanedFindings[] = [];
  const fullStackOrphans = orphanAnnotations.filter(o => o.reason === 'full-stack').map(o => o.ann);
  const unmappedOrphans = orphanAnnotations.filter(o => o.reason === 'unmapped').map(o => o.ann);

  if (fullStackOrphans.length > 0) {
    orphans.push({
      reason: 'full-stack',
      annotations: fullStackOrphans,
      markdown: exportReviewFeedback(fullStackOrphans),
    });
  }
  if (unmappedOrphans.length > 0) {
    orphans.push({
      reason: 'unmapped',
      annotations: unmappedOrphans,
      markdown: exportReviewFeedback(unmappedOrphans),
    });
  }

  return { targets, orphans };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewSubmissionDialog({
  isOpen,
  action,
  onActionChange,
  requestChangesUnavailableReason,
  submission,
  generalComment,
  onGeneralCommentChange,
  platformOpenPR,
  onPlatformOpenPRChange,
  onConfirm,
  onCancel,
  isSubmitting,
  recoveryPersistsRefresh,
  mrLabel,
  platformLabel,
  postingTo,
}: ReviewSubmissionDialogProps) {
  const isCompactTouchLayout = useCompactTouchLayout();
  const generalCommentRef = useRef<HTMLTextAreaElement>(null);
  if (!isOpen) return null;

  const isApprove = action === 'approve';
  const totalOrphans = submission.orphans.reduce((n, g) => n + g.annotations.length, 0);
  const hasTargets = submission.targets.length > 0;
  const allSucceeded = hasTargets && submission.targets.every(t => t.status === 'success');
  const hasFailed = submission.targets.some(t => t.status === 'failed');
  const hasPartial = submission.targets.some(t => t.status === 'partial');
  const hasBlocked = submission.targets.some(t => t.status === 'blocked');
  const bodyLocked = hasPartial || hasBlocked;
  const isRequestChanges = action === 'request_changes';
  // #1611: the Comment / Request changes choice. It locks once any target may
  // have been posted, so a retry (or the rest of a stacked submission) always
  // carries the event the first attempt used; after a plain failure nothing
  // was posted, so the reviewer can still switch (e.g. to Comment after
  // GitHub refused Request changes).
  const showEventChoice = !isApprove && onActionChange !== undefined;
  const eventChoiceLocked = isSubmitting ||
    submission.targets.some(t => t.status === 'success' || t.status === 'partial' || t.status === 'blocked');
  const eventOptions: Array<{ value: 'comment' | 'request_changes'; label: string; disabled: boolean }> = [
    { value: 'comment', label: '评论', disabled: eventChoiceLocked },
    {
      value: 'request_changes',
      label: '请求修改',
      disabled: eventChoiceLocked || requestChangesUnavailableReason !== undefined,
    },
  ];

  return (
    <Dialog
      open={isOpen}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onCancel();
      }}
    >
      <DialogContent
        hideClose
        initialFocus={isCompactTouchLayout || bodyLocked ? false : () => generalCommentRef.current}
        backdropClassName="bg-background/80 backdrop-blur-sm"
        className="!max-h-full max-w-md rounded-xl bg-card p-0 text-foreground shadow-2xl transition-none"
      >
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
        <DialogTitle className="font-semibold mb-1">
          {isApprove ? `批准 ${mrLabel}` : isRequestChanges ? '请求修改' : '发布审查评论'}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mb-3">
          {isApprove
            ? '为批准添加一条通用评论（可选）。'
            : '确认将要发布的内容。'}
        </DialogDescription>

        {/* The native radios stay visible, so keyboard focus keeps the
            browser's own focus ring. No new utility classes here: the
            guides.show viewer scans this file and pins its CSS. */}
        {showEventChoice && (
          <fieldset data-review-event-choice className="mb-3">
            <legend className="sr-only">审查类型</legend>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              {eventOptions.map(option => {
                const checked = action === option.value;
                return (
                  <label
                    key={option.value}
                    data-pn-touch-target
                    className={`flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium select-none ${
                      checked ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    } ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-foreground'}`}
                  >
                    <input
                      type="radio"
                      name="review-event"
                      value={option.value}
                      checked={checked}
                      disabled={option.disabled}
                      aria-describedby={option.value === 'request_changes' && requestChangesUnavailableReason ? 'review-request-changes-reason' : undefined}
                      onChange={() => onActionChange?.(option.value)}
                      className="shrink-0"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {requestChangesUnavailableReason && (
              <p id="review-request-changes-reason" className="mt-1 text-xs text-muted-foreground">
                {requestChangesUnavailableReason}
              </p>
            )}
          </fieldset>
        )}

        {/* General comment */}
        <textarea
          ref={generalCommentRef}
          data-pn-mobile-editable
          value={generalComment}
          onChange={e => onGeneralCommentChange(e.target.value)}
          placeholder="留下评论…"
          rows={3}
          disabled={bodyLocked}
          aria-describedby={bodyLocked ? 'review-general-comment-lock' : undefined}
          className="w-full rounded-md border border-border bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        {bodyLocked && (
          <div id="review-general-comment-lock" className="mt-1 mb-3 text-xs text-warning">
            {hasBlocked
              ? `通用评论已锁定，因为 ${platformLabel} 可能已收到它。在检查 ${mrLabel} 之前，自动重试已被阻止。`
              : '通用评论已锁定，因为它可能已经发布。安全重试不会重复发送。'}
          </div>
        )}
        {!bodyLocked && <div className="mb-3" />}

        {postingTo && !hasTargets && (
          <p className="mb-3 text-sm text-muted-foreground" data-review-posting-to="">
            发布到 <span className="font-medium text-foreground">{postingTo}</span>
          </p>
        )}

        {/* Targets */}
        {submission.targets.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              发布到
            </div>
            <div className="space-y-1.5">
              {submission.targets.map(target => (
                <div
                  key={target.prUrl}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-0.5 shrink-0">
                    {target.status === 'success' ? (
                      <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : target.status === 'partial' ? (
                      <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.6l-7.4 13A2 2 0 004.7 19h14.6a2 2 0 001.8-2.4l-7.4-13a2 2 0 00-3.4 0z" />
                      </svg>
                    ) : target.status === 'failed' ? (
                      <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : target.status === 'blocked' ? (
                      <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.6l-7.4 13A2 2 0 004.7 19h14.6a2 2 0 001.8-2.4l-7.4-13a2 2 0 00-3.4 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {target.prRepo}#{target.prNumber}{target.prTitle ? ` — ${target.prTitle}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {target.annotationCount} 条评论，涉及 {target.fileCount} 个文件
                    </div>
                    {target.outsideDiffCount ? (
                      <div className="text-xs text-muted-foreground mt-0.5" data-outside-diff-note>
                        {target.outsideDiffCount === 1
                          ? '1 条评论位于差异之外的行上，因此会附上代码引用和链接放在审查的主评论中。'
                          : `${target.outsideDiffCount} 条评论位于差异之外的行上，因此会附上代码引用和链接放在审查的主评论中。`}
                      </div>
                    ) : null}
                    {(target.status === 'failed' || target.status === 'partial') && target.error && (
                      <div className="text-xs text-destructive mt-0.5">{target.error}</div>
                    )}
                    {target.status === 'partial' && target.partial && (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                        <div className="font-medium text-warning">
                          审查已部分发布
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          本次尝试已发布 {target.partial.postedFileCommentCount} 条行内评论{target.partial.reviewBodyPosted ? '和通用评论' : ''}。
                        </div>
                        {target.partial.failedFileComments.length > 0 && (
                          <>
                            <div className="mt-1 text-muted-foreground">
                              {target.partial.failedFileComments.length} 条行内评论发布失败：
                            </div>
                            <ul className="mt-1 space-y-1">
                              {target.partial.failedFileComments.map(({ comment, error }) => (
                                <li key={`${comment.path}:${comment.line}:${comment.body}`} className="min-w-0">
                                  <div className="font-mono break-all">{comment.path}:{comment.line}</div>
                                  <div className="truncate text-foreground" title={comment.body}>{comment.body}</div>
                                  <div className="break-words text-destructive">{error}</div>
                                </li>
                              ))}
                            </ul>
                            <CopyButton
                              text={buildFailedCommentsMarkdown(target.partial)}
                              variant="inline"
                              label="复制失败的评论"
                              className="mt-1"
                            />
                          </>
                        )}
                        {target.partial.reviewBodyError && (
                          <div className="mt-1 break-words text-destructive">
                            {target.partial.reviewBodyError}
                          </div>
                        )}
                        {target.partial.approval === 'failed' && (
                          <div className="mt-1 text-destructive">
                            {target.partial.approvalError ?? `批准 ${mrLabel} 失败。`}
                          </div>
                        )}
                        <div className="mt-1 text-muted-foreground">
                          {describePartialRetry(target.partial, mrLabel)}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {recoveryPersistsRefresh
                            ? '你可以关闭并重新打开此对话框，或刷新此标签页；Plannotator 会将这个缩小范围的重试保留在标签页级的恢复存储中。'
                            : '你可以在当前页面关闭并重新打开此对话框。请保持页面打开，因为标签页级刷新恢复不可用。'}
                        </div>
                        {target.partial.recoveryFile && (
                          <div className="mt-1 text-muted-foreground">
                            恢复副本： <code className="break-all text-foreground">{target.partial.recoveryFile}</code>
                          </div>
                        )}
                      </div>
                    )}
                    {target.status === 'blocked' && (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                        <div className="font-medium text-warning">自动重试已被阻止</div>
                        <div className="mt-1 break-words text-muted-foreground">
                          {target.error ?? `该 ${mrLabel} 可能已包含本次审查的一部分。请先检查，再开始新的提交。`}
                        </div>
                        {target.partial && target.partial.failedFileComments.length > 0 && (
                          <CopyButton
                            text={buildFailedCommentsMarkdown(target.partial)}
                            variant="inline"
                            label="复制最近一次已知的未发布评论"
                            className="mt-1"
                          />
                        )}
                        {target.partial?.recoveryFile && (
                          <div className="mt-1 text-muted-foreground">
                            最近的恢复副本： <code className="break-all text-foreground">{target.partial.recoveryFile}</code>
                          </div>
                        )}
                        <div className="mt-1 text-muted-foreground">
                          {recoveryPersistsRefresh
                            ? '关闭并重新打开此对话框，或刷新此标签页，都会把该阻断保留在标签页级恢复存储中。'
                            : '关闭对话框会把该阻断保留在当前页面。请保持页面打开，因为标签页级刷新恢复不可用。'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orphaned annotations */}
        {totalOrphans > 0 && (
          <div className="mb-3 p-3 rounded-md bg-warning/10 border border-warning/20">
            <div className="text-xs font-medium text-warning uppercase tracking-wide mb-1">
              无法发布为行内评论（{totalOrphans}）
            </div>
            {submission.orphans.map(group => (
              <div key={group.reason} className="text-xs text-muted-foreground mb-2">
                {group.reason === 'full-stack'
                  ? `${group.annotations.length} 条来自全栈视图的发现——行号无法映射到单个 ${mrLabel} 的差异。`
                  : `${group.annotations.length} 条批注无法归属到特定的 ${mrLabel}。`}
              </div>
            ))}
            <div className="flex gap-2">
              {submission.orphans.map(group => (
                <CopyButton
                  key={group.reason}
                  text={group.markdown}
                  variant="inline"
                  label={submission.orphans.length > 1
                    ? `复制${group.reason === 'full-stack' ? '全栈' : '未映射'}`
                    : '复制为 Markdown'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Open PR checkbox */}
        <label data-pn-touch-target className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={platformOpenPR}
            onChange={e => onPlatformOpenPRChange(e.target.checked)}
            className="rounded border-border"
          />
          提交后在 {platformLabel} 上查看
        </label>

        </div>

        {/* Actions */}
        <div className="shrink-0 flex justify-end gap-2 border-t border-border/50 bg-card px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
          <button
            data-pn-touch-target
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
          >
            {hasPartial || hasBlocked ? '关闭' : '取消'}
          </button>
          <button
            data-pn-touch-target
            onClick={onConfirm}
            disabled={isSubmitting || hasBlocked || (!hasTargets && !isApprove && !generalComment.trim()) || allSucceeded}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-opacity ${
              isSubmitting || hasBlocked || (!hasTargets && !isApprove && !generalComment.trim()) || allSucceeded
                ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                : isApprove
                  ? 'bg-success text-success-foreground hover:opacity-90'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {isSubmitting
              ? '发布中…'
              : hasBlocked
                ? '重试已阻止'
              : hasPartial
                ? '重试未发布内容'
                : hasFailed
                  ? '重试失败项'
                  : isApprove
                    ? '批准'
                    : isRequestChanges
                      ? '请求修改'
                      : '发布评论'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
