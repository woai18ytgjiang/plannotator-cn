import type { MutableRefObject } from 'react';
import type { CodeAnnotation } from '@plannotator/ui/types';
import type { LiveReviewActions } from './useLiveReview';
import { LiveComposer } from './LiveComposer';
import type { PRReviewThread } from '@plannotator/shared/pr-types';
import { agentLabel, authorName, threadLines, type PlacedThread } from './model';
import { prThreadPlace } from './PRThreadCard';
import { LiveAuthorMark } from './LiveMark';

const short = (path: string) => path.split('/').pop() ?? path;
const ICON = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40';

function UnsentRow({ comment, onSend }: { comment: CodeAnnotation; onSend: () => void }) {
  const lines = comment.scope === 'file' || comment.lineStart <= 0 ? 'file' : comment.lineStart === comment.lineEnd ? `${comment.lineStart}` : `${comment.lineStart}–${comment.lineEnd}`;
  return (
    <li className="flex items-start gap-2 px-3 py-1.5" data-live-unsent={comment.id}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-muted-foreground" title={comment.filePath}>{short(comment.filePath)}:{lines}</div>
        <div className="line-clamp-2 text-[13px] leading-5 text-foreground">{comment.text}</div>
      </div>
      <button type="button" className="h-7 shrink-0 rounded px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onSend}>
        发送
      </button>
    </li>
  );
}

function ThreadRow({ thread, focused, posted, onOpen }: { thread: PlacedThread; focused: boolean; posted: boolean; onOpen: () => void }) {
  const { conversation, now } = thread;
  const last = conversation.messages[conversation.messages.length - 1]!;
  const state = conversation.resolved ? '已解决' : now.place === 'changed' ? '代码已变更' : now.place === 'unknown' ? '不在本差异中' : null;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={focused ? 'true' : undefined}
        data-live-row={conversation.id}
        className={`flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-muted ${focused ? 'bg-muted' : ''}`}
      >
        <span className="flex gap-1.5 text-[12px] text-muted-foreground">
          <span className="truncate" title={conversation.anchor.file}>{short(conversation.anchor.file)}</span>
          <span>{threadLines(now)}</span>
          {state ? <span>· {state}</span> : null}
          {posted ? <span>· 在代码平台上</span> : null}
        </span>
        <span className={`line-clamp-2 text-[13px] leading-5 ${conversation.resolved ? 'text-muted-foreground' : 'text-foreground'}`}>{conversation.messages[0]!.body}</span>
        {conversation.messages.length > 1 ? (
          <span className="flex min-w-0 max-w-full items-center gap-1 text-[12px] text-muted-foreground">
            <span className="shrink-0 whitespace-nowrap">{conversation.messages.length - 1} {conversation.messages.length === 2 ? 'reply' : 'replies'}, last from</span>
            <LiveAuthorMark message={last} />
            <span className="min-w-0 truncate" title={authorName(last)} data-live-row-author>{authorName(last)}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function LiveThreadsTab(props: {
  placed: readonly PlacedThread[];
  unsent: readonly CodeAnnotation[];
  order: readonly string[];
  focused: string | null;
  onStep: (direction: 1 | -1) => void;
  threadUrl: string | null;
  pr: { forge: string; platform: string; threads: readonly PRReviewThread[] | null; load: () => void } | null;
  actions: MutableRefObject<LiveReviewActions>;
}) {
  const actions = props.actions.current;
  const to = actions.defaultTo ? agentLabel(actions.defaultTo) : null;
  const resolvedCount = props.placed.filter((p) => p.conversation.resolved).length;
  return (
    <div className="flex flex-col text-[13px]" data-live-tab>
      <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
        <span className="whitespace-nowrap text-[12px] text-muted-foreground" data-live-count>
          {props.order.length} open{resolvedCount > 0 ? ` · ${resolvedCount} 个已解决` : ''}
        </span>
        <span className="flex-1" />
        {props.threadUrl ? (
          <a href={props.threadUrl} target="_blank" rel="noreferrer" title="在收件箱中打开" aria-label="在收件箱中打开" className={ICON} data-live-inbox-link>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        ) : null}
        <button type="button" disabled={props.order.length === 0} title="上一个未解决话题" aria-label="上一个未解决话题" className={ICON} onClick={() => props.onStep(-1)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 10 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" disabled={props.order.length === 0} title="下一个未解决话题" aria-label="下一个未解决话题" className={ICON} onClick={() => props.onStep(1)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      {actions.error ? (
        <div role="alert" className="border-b border-border px-3 py-2 text-[12px] text-foreground">
          {actions.error}
        </div>
      ) : null}
      {props.unsent.length > 0 ? (
        <section className="border-b border-border py-1" aria-label="尚未发送">
          <h3 className="px-3 py-1 text-[12px] font-medium text-muted-foreground">尚未发送</h3>
          <ul>
            {props.unsent.map((comment) => (
              <UnsentRow key={comment.id} comment={comment} onSend={() => void actions.sendComments([comment], '', []).catch(() => {})} />
            ))}
          </ul>
          <div className="px-3 pb-2 pt-1">
            <LiveComposer
              agents={actions.agents}
              allowEmpty
              placeholder={to ? `致 ${to}。添加备注或 @ 另一个智能体` : '@ 一个智能体以发送这些内容'}
              sendLabel={props.unsent.length === 1 ? '发送' : `发送全部 ${props.unsent.length}`}
              onFocus={actions.loadAgents}
              onSend={(words, tags) => actions.sendComments(props.unsent, words, tags)}
            />
          </div>
        </section>
      ) : null}
      {props.pr && actions.postToPR && props.order.some((id) => !actions.posted.has(id)) ? (
        <div className="flex items-center border-b border-border px-3 py-1.5">
          <button
            type="button"
            className="h-7 rounded px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            data-live-post-all
            onClick={() => void actions.postToPR?.(props.order.filter((id) => !actions.posted.has(id))).catch(() => {})}
          >
            Post {props.order.filter((id) => !actions.posted.has(id)).length} open threads to the {props.pr.forge === 'GitLab' ? 'merge request' : 'pull request'}
          </button>
        </div>
      ) : null}
      {props.pr ? <PRThreadsSection pr={props.pr} onOpen={(path, line, side) => actions.revealLines(path, line, side)} /> : null}
      {props.placed.length === 0 && props.unsent.length === 0 ? (
        <p className="px-3 py-3 text-[12px] leading-5 text-muted-foreground">
          你发送给智能体的评论会在这里成为话题。在行上写评论，然后从此标签页发送。
        </p>
      ) : (
        <ul className="py-1">
          {[...props.placed].sort((a, b) => a.conversation.anchor.file.localeCompare(b.conversation.anchor.file) || a.now.line_start - b.now.line_start).map((thread) => (
            <ThreadRow key={thread.conversation.id} thread={thread} focused={props.focused === thread.conversation.id} posted={actions.posted.has(thread.conversation.id)} onOpen={() => actions.reveal(thread)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PRThreadsSection({ pr, onOpen }: { pr: { forge: string; threads: readonly PRReviewThread[] | null; load: () => void }; onOpen: (path: string, line: number, side: 'old' | 'new') => void }) {
  const where = pr.forge === 'GitLab' ? '合并请求' : '拉取请求';
  const open = (pr.threads ?? []).filter((t) => !t.isResolved);
  return (
    <section className="border-b border-border py-1" aria-label={`On the ${where}`}>
      <h3 className="px-3 py-1 text-[12px] font-medium text-muted-foreground">On the {where}</h3>
      {pr.threads === null ? (
        <div className="px-3 pb-2">
          <button type="button" className="h-7 rounded px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={pr.load} data-pr-threads-load>
            在行上显示其话题
          </button>
        </div>
      ) : open.length === 0 ? (
        <p className="px-3 pb-2 text-[12px] text-muted-foreground">No open threads on the {where}.</p>
      ) : (
        <ul>
          {open.map((thread) => {
            const place = prThreadPlace(thread);
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  disabled={!place}
                  onClick={() => place && onOpen(thread.path, place.line, place.side)}
                  className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-muted disabled:cursor-default"
                  data-pr-row={thread.id}
                >
                  <span className="flex gap-1.5 text-[12px] text-muted-foreground">
                    <span className="truncate" title={thread.path}>{short(thread.path)}</span>
                    {place ? <span>line {place.line}</span> : null}
                    {thread.isOutdated ? <span>· 已过时</span> : null}
                    <span>· {thread.comments[0]?.author ?? ''}</span>
                  </span>
                  <span className="line-clamp-2 text-[13px] leading-5 text-foreground">{thread.comments[0]?.body ?? ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
