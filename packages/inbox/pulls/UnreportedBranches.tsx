/**
 * Branch reviews' safety net, at the foot of one project's Reviews: local branches with recent commits that are not on
 * the default branch, with no pull request and no agent's report. Folded; read only when the person opens it, and read
 * again on each opening. Nothing here runs anything: "Start a review" opens New review with the branch, and the person
 * starts it there.
 */
import { useEffect, useState } from 'react';
import { INBOX_UNREPORTED_BRANCH_DAYS, type InboxUnreportedBranch, type InboxUnreportedBranchesAnswer } from '@plannotator/core/inbox-types';
import { formatCount, plural } from '@plannotator/core/inbox-format';
import { Icon } from '../icons';
import { relativeWords } from '../relativeTime';
import { readUnreportedBranches } from './branchReviews';

export function UnreportedBranches({ projectId, now, onStart }: { projectId: string; now: number; onStart: (branch: InboxUnreportedBranch, opener: HTMLElement) => void }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<{ answer: InboxUnreportedBranchesAnswer | null; error: string | null }>({ answer: null, error: null });
  useEffect(() => {
    setRead({ answer: null, error: null });
    if (!open) return;
    const controller = new AbortController();
    readUnreportedBranches(projectId, controller.signal).then(
      (answer) => setRead({ answer, error: null }),
      (cause: unknown) => {
        if (!controller.signal.aborted) setRead({ answer: null, error: cause instanceof Error ? cause.message : 'The branches could not be read.' });
      },
    );
    return () => controller.abort();
  }, [open, projectId]);
  const branches = read.answer?.branches ?? [];
  return (
    <div className="ib-group ib-pr-fold" role="group" aria-label="无人报告的分支" data-reviews-unreported={projectId}>
      <button type="button" className="ib-pr-foldbtn" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-reviews-unreported-toggle="">
        <Icon name={open ? 'chevD' : 'chevR'} size={14} />
        Branches nobody reported {read.answer && branches.length > 0 && <span className="ib-n">{formatCount(branches.length)}</span>}
      </button>
      {open && !read.answer && !read.error && <p className="ib-pr-risknote">正在读取分支…</p>}
      {open && read.error && (
        <p className="ib-error" role="alert">
          {read.error}
        </p>
      )}
      {open && read.answer && !read.answer.git && <p className="ib-pr-risknote">此项目的文件夹在这台电脑上不是 git 仓库。</p>}
      {open && read.answer?.git && branches.length === 0 && <p className="ib-pr-risknote">最近 {INBOX_UNREPORTED_BRANCH_DAYS} 天内没有其他分支有提交。</p>}
      {open &&
        branches.map((branch) => (
          <div key={branch.branch} className="ib-pr-unrep" data-reviews-unreported-branch={branch.branch}>
            <Icon name="gitBranch" size={14} />
            <span className="ib-pr-unrep-t">
              <span className="ib-pr-unrep-name" dir="auto">
                {branch.branch}
              </span>
              <span className="ib-pr-unrep-line">
                {plural(branch.ahead, 'commit')} not on {branch.base} · {relativeWords(branch.last_commit_at, now)}
              </span>
            </span>
            <button type="button" className="ib-btn" onClick={(event) => onStart(branch, event.currentTarget)} data-reviews-unreported-start="">
              Start a review
            </button>
          </div>
        ))}
    </div>
  );
}
