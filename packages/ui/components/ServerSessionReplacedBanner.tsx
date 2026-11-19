// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import React from 'react';
import { useServerSessionReplaced } from '../utils/serverSession';

/**
 * The stale-tab prompt (packages/ui/utils/serverSession.ts): shown once a
 * decision was refused with `409 session_mismatch`, i.e. the Plannotator
 * session this tab was opened for is gone and a newer one owns the address.
 * Nothing was submitted; reloading shows what is open there now.
 */
export const ServerSessionReplacedBanner: React.FC<{ onReload?: () => void }> = ({ onReload }) => {
  const replaced = useServerSessionReplaced();
  if (!replaced) return null;
  return (
    <div
      role="alert"
      data-server-session-replaced
      className="fixed inset-x-0 top-0 z-[110] flex items-center justify-center gap-3 border-b border-border bg-destructive/95 px-4 py-2 text-sm text-destructive-foreground shadow-md"
    >
      <span>此次审查已被替换 — 重新加载以查看当前打开的内容。未提交任何内容。</span>
      <button
        type="button"
        onClick={onReload ?? (() => window.location.reload())}
        className="rounded border border-destructive-foreground/40 px-2 py-0.5 font-medium hover:bg-destructive-foreground/10"
      >
        重新加载
      </button>
    </div>
  );
};
