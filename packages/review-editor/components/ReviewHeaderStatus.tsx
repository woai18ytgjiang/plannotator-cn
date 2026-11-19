import React from 'react';

export type ReviewStatusKind = 'platform-error' | 'workspace-error' | 'partial-diff' | 'stale-diff' | 'base-behind';

export interface ReviewStatusInput {
  platformActionError: string | null;
  workspaceDiffError: string | null;
  partialDiff: boolean;
  staleDiff: boolean;
  baseBehind: boolean;
}

export function pickReviewStatus(input: ReviewStatusInput): ReviewStatusKind | null {
  if (input.platformActionError) return 'platform-error';
  if (input.workspaceDiffError) return 'workspace-error';
  if (input.partialDiff) return 'partial-diff';
  if (input.staleDiff) return 'stale-diff';
  if (input.baseBehind) return 'base-behind';
  return null;
}

export interface ReviewHeaderStatusProps extends ReviewStatusInput {
  variant: 'pill' | 'strip';
  hasFiles: boolean;
  platformLabel: string;
  canLoadFullDiff: boolean;
  isLoadingFullDiff: boolean;
  onLoadFullDiff: () => void;
  onRefreshStaleDiff: () => void;
  onDismissStaleDiff: () => void;
  isFetchingBase: boolean;
  onFetchBase: () => void;
}

const PILL = 'flex min-w-0 items-center gap-2 rounded border px-2 py-1 text-xs';
const PILL_WARN = `${PILL} border-warning/30 bg-warning/10 text-warning`;
const STRIP = 'shrink-0 flex items-center justify-between gap-3 border-b px-3 py-1.5 text-xs';
const STRIP_WARN = `${STRIP} border-warning/20 bg-warning/10 text-warning`;
const ACTION = 'shrink-0 font-medium underline underline-offset-2 disabled:opacity-60';

function Spinner() {
  return <span className="inline-block w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" aria-hidden />;
}

export const ReviewHeaderStatus: React.FC<ReviewHeaderStatusProps> = (props) => {
  const kind = pickReviewStatus(props);
  if (!kind) return null;
  const strip = props.variant === 'strip';
  const touch = strip || undefined;

  if (kind === 'platform-error') {
    return strip ? (
      <div className={`${STRIP} border-destructive/20 bg-destructive/10 text-destructive`} data-review-status={kind}>{props.platformActionError}</div>
    ) : (
      <div className={`${PILL} max-w-[240px] border-destructive/20 bg-destructive/10 text-destructive`} title={props.platformActionError ?? undefined} data-review-status={kind}>
        <span className="truncate">{props.platformActionError}</span>
      </div>
    );
  }

  if (kind === 'workspace-error') {
    const text = props.hasFiles ? '部分工作区更改无法加载' : '工作区更改无法加载';
    return strip ? (
      <div className={STRIP_WARN} data-review-status={kind}>{text}.</div>
    ) : (
      <div className={`${PILL_WARN} max-w-[240px]`} title={props.workspaceDiffError ?? undefined} data-review-status={kind}>
        <span className="truncate">{text}</span>
      </div>
    );
  }

  if (kind === 'partial-diff') {
    const action = !props.canLoadFullDiff ? null : props.isLoadingFullDiff ? (
      <span className="flex items-center gap-1.5 font-medium" title="正在从本地检出重新计算完整差异。你可以继续审查。">
        <Spinner />
        正在加载完整差异…
      </span>
    ) : (
      <button
        type="button"
        data-pn-touch-target={touch}
        onClick={props.onLoadFullDiff}
        className={ACTION}
        title="从本地检出重新计算完整差异（可能需要等待后台克隆；你可以继续审查）"
      >
        加载完整差异
      </button>
    );
    return (
      <div className={strip ? STRIP_WARN : PILL_WARN} data-review-status={kind}>
        <span
          className="min-w-0 truncate"
          title={props.canLoadFullDiff
            ? `${props.platformLabel} omitted diff content for some files because this PR is too large`
            : '平台省略了部分文件的差异内容，而本次会话没有可用于重新计算的本地检出。CLI 会话可以加 --local 重新运行审查。'}
        >
          {strip ? '平台省略了此差异的一部分。' : props.canLoadFullDiff ? '部分差异' : '部分差异（无本地检出）'}
        </span>
        {action}
      </div>
    );
  }

  if (kind === 'stale-diff') {
    return (
      <div className={strip ? STRIP_WARN : PILL_WARN} data-review-status={kind}>
        <span>差异已过期</span>
        <button type="button" data-pn-touch-target={touch} onClick={props.onRefreshStaleDiff} className={ACTION} title="使用当前设置重新运行差异">
          刷新
        </button>
        {!strip && (
          <button type="button" onClick={props.onDismissStaleDiff} className="leading-none opacity-70 hover:opacity-100" title="忽略" aria-label="忽略过期差异提示">
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={strip ? STRIP_WARN : PILL_WARN} data-review-status={kind}>
      <span>{strip ? 'Baseline is behind the remote.' : 'Baseline is behind GitHub'}</span>
      {props.isFetchingBase ? (
        <span className="flex items-center gap-1.5 font-medium">
          <Spinner />
          获取中…
        </span>
      ) : (
        <button type="button" data-pn-touch-target={touch} onClick={props.onFetchBase} disabled={props.isFetchingBase} className={ACTION} title="git fetch 默认分支并重新计算差异">
          获取
        </button>
      )}
    </div>
  );
};
