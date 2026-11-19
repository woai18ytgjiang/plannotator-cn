// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import {
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { InputMethod } from '../types';
import type { SemanticTarget } from '../utils/blockTargeting';
import {
  resolveTextPosition,
  type VimSelectionState,
} from '../utils/vimNavigation';
import { getVimHudPhase, type VimHudCommand } from '../utils/vimHud';
import { VimKeyHud } from './VimKeyHud';
import { VimTargetReticle } from './VimTargetReticle';

interface CursorPosition {
  readonly top: number;
  readonly left: number;
  readonly height: number;
}

/** Props for Vim's cursor, status, and contextual-help feedback. */
export interface VimModeOverlayProps {
  containerRef: RefObject<HTMLElement | null>;
  inputMethod: InputMethod;
  state: VimSelectionState;
  focused: boolean;
  hudEnabled: boolean;
  keyPanelEnabled: boolean;
  hudCommand: VimHudCommand | null;
  activeTarget: SemanticTarget | null;
  helpOpen: boolean;
  onHelpOpenChange: (open: boolean) => void;
  onKeyPanelHide?: () => void;
  onHudFocusLeave: () => void;
}

/**
 * Render immediate, non-interactive feedback for Vim mode without changing
 * document layout or intercepting pointer selection.
 */
export function VimModeOverlay({
  containerRef,
  inputMethod,
  state,
  focused,
  hudEnabled,
  keyPanelEnabled,
  hudCommand,
  activeTarget,
  helpOpen,
  onHelpOpenChange,
  onKeyPanelHide,
  onHudFocusLeave,
}: VimModeOverlayProps) {
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (
      !container
      || !focused
      || state.phase !== 'text'
    ) {
      setCursorPosition(null);
      return;
    }
    const cursor = state.cursor;

    const update = () => {
      const point = resolveTextPosition(container, cursor);
      if (!point) {
        setCursorPosition(null);
        return;
      }

      const range = document.createRange();
      range.setStart(point.node, point.offset);
      range.collapse(true);
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const parent = point.node.parentElement;
      const lineHeight = parent
        ? Number.parseFloat(getComputedStyle(parent).lineHeight)
        : Number.NaN;
      setCursorPosition({
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left,
        height: rect.height || lineHeight || 18,
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [containerRef, focused, state]);

  const active = state.phase !== 'inactive'
    && (focused || state.phase === 'action');
  const keyPanelVisible = hudEnabled
    && (helpOpen || (keyPanelEnabled && active));
  const phaseLabel = state.phase === 'visual-block'
    ? 'VISUAL BLOCK'
    : state.phase === 'text'
      ? 'NORMAL'
      : state.phase.toUpperCase();
  const inputLabel = inputMethod === 'pinpoint' ? '精确定位' : '选择';
  const hudPhase = getVimHudPhase(state.phase, hudCommand?.actionId);

  return (
    <>
      {cursorPosition && (
        <div
          data-vim-cursor
          aria-hidden="true"
          className="absolute z-[26] w-[2px] rounded-full bg-primary pointer-events-none"
          style={{
            top: cursorPosition.top,
            left: cursorPosition.left,
            height: cursorPosition.height,
          }}
        />
      )}

      {active && hudEnabled && (
        <VimTargetReticle
          containerRef={containerRef}
          state={state}
          target={activeTarget}
          command={hudCommand}
        />
      )}

      {keyPanelVisible && createPortal(
        <VimKeyHud
          command={hudCommand}
          phase={hudPhase}
          inputMethod={inputMethod}
          expanded={helpOpen}
          onExpandedChange={onHelpOpenChange}
          onHide={
            onKeyPanelHide
              ? () => {
                onHelpOpenChange(false);
                onKeyPanelHide();
              }
              : undefined
          }
          onFocusLeave={onHudFocusLeave}
        />,
        document.body,
      )}

      {active && !hudEnabled && createPortal(
        <div
          data-vim-mode-badge
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[120] -translate-x-1/2 rounded-md border border-primary/30 bg-popover/95 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-primary shadow-lg backdrop-blur-sm pointer-events-none"
        >
          {phaseLabel} · {inputLabel}
        </div>,
        document.body,
      )}

      {helpOpen && !hudEnabled && createPortal(
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-background/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Vim 控制"
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === '?') {
              event.preventDefault();
              event.stopPropagation();
              onHelpOpenChange(false);
            }
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onHelpOpenChange(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Vim 控制</div>
                <div className="text-xs text-muted-foreground">
                  在文档结构中移动，深入到文本，然后添加批注。
                </div>
              </div>
              <button
                type="button"
                onClick={() => onHelpOpenChange(false)}
                className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                关闭
              </button>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <kbd className="font-mono text-primary">j / k · gg / G</kbd>
              <span>上一个 / 下一个块或同级块；第一个 / 最后一个块</span>
              <kbd className="font-mono text-primary">h / l · Esc</kbd>
              <span>向外移动、向内细化，或退回上一层</span>
              <kbd className="font-mono text-primary">v / V</kbd>
              <span>精确文本 / 整块选择</span>
              <kbd className="font-mono text-primary">h j k l · w b e · 0 $</kbd>
              <span>进入 NORMAL 后的文本移动</span>
              <kbd className="font-mono text-primary">o</kbd>
              <span>交换可视选择的起止端</span>
              <kbd className="font-mono text-primary">Enter</kbd>
              <span>使用当前批注模式</span>
              <kbd className="font-mono text-primary">Space · c d m t y</kbd>
              <span>操作、评论、删除、标注、标签、复制</span>
              <kbd className="font-mono text-primary">Esc · ?</kbd>
              <span>取消当前状态 / 切换此帮助</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
