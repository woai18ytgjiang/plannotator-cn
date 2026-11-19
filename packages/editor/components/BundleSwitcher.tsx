import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * The file switcher of a review of several files (annotate bundles):
 * "2 of 3 · mock.html" between previous and next. The order is the one the
 * files were given in. `index` is 1-based; 0 means the open document is not
 * one of the bundle's files (a linked document, or none), and then the
 * switcher names the count and its next button opens the first file.
 */
export interface BundleSwitcherProps {
  index: number;
  total: number;
  /** File name of the open bundle file; ignored when `index` is 0. */
  name?: string;
  /** Full path, for the tooltip. */
  title?: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function BundleSwitcher({ index, total, name, title, onPrevious, onNext }: BundleSwitcherProps) {
  const inBundle = index > 0;
  const canGoBack = inBundle && index > 1;
  const canGoForward = !inBundle || index < total;
  const buttonClass =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  return (
    <nav
      aria-label="本次审查的文件"
      data-bundle-switcher="true"
      className="flex min-w-0 items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 px-0.5 py-0.5 text-xs"
    >
      <button type="button" className={buttonClass} onClick={onPrevious} disabled={!canGoBack} aria-label="上一个文件" title="上一个文件">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="min-w-0 truncate px-1 text-foreground/90" title={inBundle ? title : undefined} aria-live="polite">
        {inBundle ? (
          <>
            <span className="tabular-nums text-muted-foreground">
              {index} / {total}
            </span>
            <span className="text-muted-foreground"> · </span>
            <span data-bundle-switcher-name="true">{name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">共 {total} 个文件</span>
        )}
      </span>
      <button type="button" className={buttonClass} onClick={onNext} disabled={!canGoForward} aria-label="下一个文件" title="下一个文件">
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </nav>
  );
}
