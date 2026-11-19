// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import type { ReactNode } from 'react';
import { useAutoClose } from '../hooks/useAutoClose';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const CheckIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CompletionOverlayProps {
  /** `done`: the session finished with nothing sent (an annotate Done with
   *  no feedback). Neutral styling. `done` and `exited` (Close) send nothing,
   *  so neither shows the "response has been sent" line. */
  submitted: 'approved' | 'denied' | 'feedback' | 'done' | 'exited' | null | false;
  title: string;
  subtitle: string;
  agentLabel: string;
  /**
   * Optional destinations shown under the subtitle as ordinary links (opened
   * in a new tab by a real click, so no popup blocker applies) — e.g. the PR
   * a platform review was just posted to. Omitted or empty renders nothing.
   */
  links?: ReadonlyArray<{ href: string; label: string }>;
  /**
   * Optional content in place under the done message (Plannotator's "Star the repo" card, `useStarAskDoneScreen`).
   * With it, the done block moves to the top of the screen (480 px wide) to make room, and the screen scrolls. Omitted
   * or null: the done screen is exactly as before.
   */
  footer?: ReactNode;
}

export function CompletionOverlay({ submitted, title, subtitle, agentLabel, links, footer }: CompletionOverlayProps) {
  const { state, enableAndStart } = useAutoClose(!!submitted);

  if (!submitted) return null;

  const isApproved = submitted === 'approved';
  const isDone = submitted === 'done';
  const sentNothing = isDone || submitted === 'exited';
  const hasFooter = footer !== undefined && footer !== null && footer !== false;

  return (
    <div
      className={hasFooter
        ? 'fixed inset-0 z-[100] bg-background flex items-start justify-center overflow-y-auto pt-10 pb-8 sm:pt-[72px] sm:pb-12'
        : 'fixed inset-0 z-[100] bg-background flex items-center justify-center'}
      data-completion-state={submitted}
    >
      <div className={hasFooter ? 'text-center space-y-6 w-full max-w-[480px] px-8' : 'text-center space-y-6 max-w-md px-8'}>
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isApproved ? 'bg-success/20 text-success'
            : isDone ? 'bg-muted text-muted-foreground'
            : 'bg-accent/20 text-accent-text'
          }`}
        >
          {isApproved || isDone ? <CheckIcon /> : <ChatBubbleIcon />}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
          {links && links.length > 0 && (
            <div className="flex flex-col items-center gap-1 pt-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-completion-link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline break-all"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          {state.phase === 'counting' ? (
            <>
              <p className="text-sm text-muted-foreground">
                此标签页将在 <span className="text-foreground font-medium">{state.remaining}</span> 秒后关闭…
              </p>
              <p className="text-xs text-muted-foreground/60">你可以在「设置」中修改此项。</p>
            </>
          ) : state.phase === 'closeFailed' ? (
            <>
              <p className="text-sm text-muted-foreground">
                无法自动关闭此标签页，请手动关闭。
              </p>
              <p className="text-xs text-muted-foreground/60">
                仅当标签页由 {agentLabel} 打开时，自动关闭才有效。
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                你可以关闭此标签页并返回 <span className="text-foreground font-medium">{agentLabel}</span>。
              </p>
              {state.phase === 'prompt' ? (
                <>
                  <label className="flex items-center justify-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={false} onChange={enableAndStart} className="accent-primary" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      3 秒后自动关闭此标签页
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground/60">你可以在「设置」中修改延时。</p>
                </>
              ) : sentNothing ? null : (
                <p className="text-xs text-muted-foreground/60">你的回复已发送。</p>
              )}
            </>
          )}
        </div>
        {hasFooter && footer}
      </div>
    </div>
  );
}
