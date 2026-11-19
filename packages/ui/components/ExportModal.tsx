// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * Export Modal with tabs for Share, Annotations, and Notes
 *
 * Share tab (default): Shows shareable URL with copy button
 * Annotations tab: Shows human-readable annotations output with copy/download
 * Notes tab: Save plan to Obsidian/Bear without approving
 */

import React, { useState, useEffect } from 'react';
import { getObsidianSettings, getEffectiveVaultPath } from '../utils/obsidian';
import { getBearSettings } from '../utils/bear';
import { getOctarineSettings } from '../utils/octarine';
import { getNotionParentPageId, isNotionAvailable } from '../utils/notion';
import { wrapFeedbackForAgent } from '../utils/parser';
import { copyTextToClipboard } from '../utils/clipboard';
import { noteServerSessionMismatch, withServerSession } from '../utils/serverSession';
import { OverlayScrollArea } from './OverlayScrollArea';

/** POST body shape sent to the notes endpoint (mirrors what the Notes tab builds today). */
interface SaveToNotesPayload {
  obsidian?: object;
  bear?: object;
  octarine?: object;
  notion?: object;
}

/** Parsed response from the notes endpoint. */
interface SaveToNotesResult {
  results?: Record<string, { success?: boolean; error?: string; url?: string }>;
}

/** Default save-to-notes wire: today's literal POST to /api/save-notes. */
async function defaultSaveToNotes(body: SaveToNotesPayload): Promise<SaveToNotesResult> {
  const res = await fetch('/api/save-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The stale-tab guard (a no-op for a host that never adopted a session).
    body: JSON.stringify(withServerSession(body)),
  });
  if (await noteServerSessionMismatch(res)) {
    return { results: Object.fromEntries(Object.keys(body).map((k) => [k, { success: false, error: '此审查已被替换。请重新加载页面。' }])) };
  }
  return res.json();
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareUrlSize: string;
  /** Short share URL from the paste service (empty string when unavailable) */
  shortShareUrl?: string;
  /** Whether the short URL is currently being generated */
  isGeneratingShortUrl?: boolean;
  /** Error from the last short URL generation attempt (empty string = no error) */
  shortUrlError?: string;
  /** Generate a short URL on demand (user clicks "Create short link") */
  onGenerateShortUrl?: () => void | Promise<unknown>;
  annotationsOutput: string;
  annotationCount: number;
  taterSprite?: React.ReactNode;
  sharingEnabled?: boolean;
  markdown?: string;
  isApiMode?: boolean;
  initialTab?: Tab;
  /** Override the save-to-notes wire. Default: POST /api/save-notes (today's behavior). */
  onSaveToNotes?: (payload: SaveToNotesPayload) => Promise<SaveToNotesResult>;
  /**
   * Wrap the annotations output for the clipboard Copy button. Annotate
   * sessions pass a mode-aware wrapper so Copy matches Send Feedback instead
   * of the plan-deny framing (#1107). Default: plan-deny wrap (today's
   * plan-review behavior).
   */
  wrapCopiedAnnotations?: (feedback: string) => string;
}

type Tab = 'share' | 'annotations' | 'notes';

type SaveTarget = 'obsidian' | 'bear' | 'octarine' | 'notion';
type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  shareUrlSize,
  shortShareUrl = '',
  isGeneratingShortUrl = false,
  shortUrlError = '',
  onGenerateShortUrl,
  annotationsOutput,
  annotationCount,
  taterSprite,
  sharingEnabled = true,
  markdown,
  isApiMode = false,
  initialTab,
  onSaveToNotes = defaultSaveToNotes,
  wrapCopiedAnnotations = wrapFeedbackForAgent,
}) => {
  const defaultTab = initialTab || (sharingEnabled ? 'share' : 'annotations');
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [copied, setCopied] = useState<'short' | 'full' | 'annotations' | false>(false);
  const [saveStatus, setSaveStatus] = useState<Record<SaveTarget, SaveStatus>>({ obsidian: 'idle', bear: 'idle', octarine: 'idle', notion: 'idle' });
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [savedUrls, setSavedUrls] = useState<Partial<Record<SaveTarget, string>>>({});

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || (sharingEnabled ? 'share' : 'annotations'));
    }
  }, [isOpen, initialTab, sharingEnabled]);

  // Reset save status when modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveStatus({ obsidian: 'idle', bear: 'idle', octarine: 'idle', notion: 'idle' });
      setSaveErrors({});
      setSavedUrls({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotesTab = isApiMode && !!markdown;
  const obsidianSettings = getObsidianSettings();
  const bearSettings = getBearSettings();
  const octarineSettings = getOctarineSettings();
  const effectiveVaultPath = getEffectiveVaultPath(obsidianSettings);
  const isObsidianReady = obsidianSettings.enabled && effectiveVaultPath.trim().length > 0;
  const isBearReady = bearSettings.enabled;
  const isOctarineReady = octarineSettings.enabled && octarineSettings.workspace.trim().length > 0;
  // Notion shows only when this server offers it (NOTION_TOKEN set, local session).
  const notionAvailable = isNotionAvailable();
  const notionParentPageId = getNotionParentPageId();
  const isNotionReady = notionParentPageId !== null;

  const handleCopy = async (text: string, which: 'short' | 'full' | 'annotations') => {
    if (await copyTextToClipboard(text)) {
      setCopied(which);
      setTimeout(() => setCopied(false), 2000);
    } else {
      console.error('Failed to copy');
    }
  };

  const handleCopyAnnotations = async () => {
    await handleCopy(wrapCopiedAnnotations(annotationsOutput), 'annotations');
  };

  // Warn when the hash URL may be too long for messaging apps
  const urlIsLarge = shareUrl.length > 2048;
  // Hash-based sharing unavailable (e.g. HTML render mode) — show only short link
  const hashUnavailable = !shareUrl && !!onGenerateShortUrl;

  const handleDownloadAnnotations = () => {
    const blob = new Blob([annotationsOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToNotes = async (target: SaveTarget) => {
    if (!markdown) return;

    setSaveStatus(prev => ({ ...prev, [target]: 'saving' }));
    setSaveErrors(prev => { const next = { ...prev }; delete next[target]; return next; });

    const body: { obsidian?: object; bear?: object; octarine?: object; notion?: object } = {};

    if (target === 'obsidian') {
      body.obsidian = {
        vaultPath: effectiveVaultPath,
        folder: obsidianSettings.folder || 'plannotator',
        plan: markdown,
        ...(obsidianSettings.filenameFormat && { filenameFormat: obsidianSettings.filenameFormat }),
        ...(obsidianSettings.filenameSeparator && obsidianSettings.filenameSeparator !== 'space' && { filenameSeparator: obsidianSettings.filenameSeparator }),
      };
    }
    if (target === 'bear') {
      body.bear = { plan: markdown };
    }
    if (target === 'octarine') {
      body.octarine = {
        plan: markdown,
        workspace: octarineSettings.workspace,
        folder: octarineSettings.folder || 'plannotator',
      };
    }
    if (target === 'notion' && notionParentPageId) {
      body.notion = { plan: markdown, parentPageId: notionParentPageId };
    }

    try {
      const data = await onSaveToNotes(body);
      const result = data.results?.[target];

      if (result?.success) {
        setSaveStatus(prev => ({ ...prev, [target]: 'success' }));
        if (result.url) setSavedUrls(prev => ({ ...prev, [target]: result.url! }));
      } else {
        setSaveStatus(prev => ({ ...prev, [target]: 'error' }));
        setSaveErrors(prev => ({ ...prev, [target]: result?.error || '保存失败' }));
      }
    } catch {
      setSaveStatus(prev => ({ ...prev, [target]: 'error' }));
      setSaveErrors(prev => ({ ...prev, [target]: '保存失败' }));
    }
  };

  const handleSaveAll = async () => {
    const targets: SaveTarget[] = [];
    if (isObsidianReady) targets.push('obsidian');
    if (isBearReady) targets.push('bear');
    if (isOctarineReady) targets.push('octarine');
    if (isNotionReady) targets.push('notion');
    await Promise.all(targets.map(t => handleSaveToNotes(t)));
  };

  const readyCount = [isObsidianReady, isBearReady, isOctarineReady, isNotionReady].filter(Boolean).length;

  // Determine which tabs to show
  const showTabs = sharingEnabled || showNotesTab;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div
        className="bg-card border border-border rounded-xl w-full max-w-2xl flex flex-col max-h-[80vh] shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {taterSprite}

        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">导出</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {annotationCount} 条批注
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <OverlayScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {/* Tabs */}
          {showTabs && (
            <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
              {sharingEnabled && (
                <button
                  onClick={() => setActiveTab('share')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'share'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  分享
                </button>
              )}
              <button
                onClick={() => setActiveTab('annotations')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'annotations'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                批注
              </button>
              {showNotesTab && (
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'notes'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  备注
                </button>
              )}
            </div>
          )}

          {/* Tab content */}
          {activeTab === 'share' && sharingEnabled ? (
            <div className="space-y-4">
              {/* Short URL — primary copy target when available */}
              {shortShareUrl ? (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    分享链接
                  </label>
                  <div className="relative group">
                    <input
                      readOnly
                      value={shortShareUrl}
                      className="w-full bg-muted rounded-lg p-3 pr-20 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/50"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => handleCopy(shortShareUrl, 'short')}
                      className="absolute top-1.5 right-2 px-2 py-1 rounded text-xs font-medium bg-background/80 hover:bg-background border border-border/50 transition-colors flex items-center gap-1"
                    >
                      {copied === 'short' ? (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          复制
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    加密短链接。浏览器上传 AES-256-GCM 密文；解密密钥保留在 URL 片段中。
                  </p>
                </div>
              ) : isGeneratingShortUrl ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                  </svg>
                  正在生成短链接…
                </div>
              ) : onGenerateShortUrl ? (
                <div className={`p-3 rounded-lg border ${
                  urlIsLarge
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-muted/50 border-border'
                }`}>
                  {urlIsLarge && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                      此 URL 对某些即时通讯应用来说可能过长。
                    </p>
                  )}
                  <button
                    onClick={onGenerateShortUrl}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    创建短链接
                  </button>
                  {shortUrlError && (
                    <p className="text-[10px] text-amber-500 mt-1">({shortUrlError})</p>
                  )}
                </div>
              ) : null}

              {/* Full hash URL — hidden when hash-based sharing is unavailable (HTML mode) */}
              {!hashUnavailable && <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  {shortShareUrl ? '完整 URL（备用）' : '可分享 URL'}
                </label>
                <div className="relative group">
                  <textarea
                    readOnly
                    value={shareUrl}
                    className="w-full h-24 bg-muted rounded-lg p-3 pr-20 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
                    onClick={e => (e.target as HTMLTextAreaElement).select()}
                  />
                  <button
                    onClick={() => handleCopy(shareUrl, 'full')}
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-background/80 hover:bg-background border border-border/50 transition-colors flex items-center gap-1"
                  >
                    {copied === 'full' ? (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        已复制
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        复制
                      </>
                    )}
                  </button>
                  <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {shareUrlSize}
                  </div>
                </div>
                {!shortShareUrl && !isGeneratingShortUrl && !urlIsLarge && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    分享内容在 URL 片段中是压缩而非加密的。门户请求不会包含该片段。
                  </p>
                )}
              </div>}

              <p className="text-xs text-muted-foreground">
                任何拿到完整链接的人都能查看分享内容，包括用于发送链接的服务。托管短链接密文 7 天后过期。
              </p>
            </div>
          ) : activeTab === 'notes' && showNotesTab ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                无需批准或拒绝，即可将此计划保存到你的笔记应用。
              </p>

              {/* Obsidian */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isObsidianReady ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                    <span className="text-sm font-medium">Obsidian</span>
                  </div>
                  {isObsidianReady ? (
                    <button
                      onClick={() => handleSaveToNotes('obsidian')}
                      disabled={saveStatus.obsidian === 'saving'}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        saveStatus.obsidian === 'success'
                          ? 'bg-success/15 text-success'
                          : saveStatus.obsidian === 'error'
                            ? 'bg-destructive/15 text-destructive'
                            : saveStatus.obsidian === 'saving'
                              ? 'bg-muted text-muted-foreground opacity-50'
                              : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      {saveStatus.obsidian === 'saving' ? '保存中…'
                        : saveStatus.obsidian === 'success' ? '已保存'
                        : saveStatus.obsidian === 'error' ? '失败'
                        : '保存'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">未配置</span>
                  )}
                </div>
                {isObsidianReady && (
                  <div className="text-[10px] text-muted-foreground/70">
                    {effectiveVaultPath}/{obsidianSettings.folder || 'plannotator'}/
                  </div>
                )}
                {!isObsidianReady && (
                  <div className="text-[10px] text-muted-foreground/70">
                    在「设置 &gt; 保存 &gt; Obsidian」中启用
                  </div>
                )}
                {saveErrors.obsidian && (
                  <div className="text-[10px] text-destructive">{saveErrors.obsidian}</div>
                )}
              </div>

              {/* Bear */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isBearReady ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                    <span className="text-sm font-medium">Bear</span>
                  </div>
                  {isBearReady ? (
                    <button
                      onClick={() => handleSaveToNotes('bear')}
                      disabled={saveStatus.bear === 'saving'}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        saveStatus.bear === 'success'
                          ? 'bg-success/15 text-success'
                          : saveStatus.bear === 'error'
                            ? 'bg-destructive/15 text-destructive'
                            : saveStatus.bear === 'saving'
                              ? 'bg-muted text-muted-foreground opacity-50'
                              : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      {saveStatus.bear === 'saving' ? '保存中…'
                        : saveStatus.bear === 'success' ? '已保存'
                        : saveStatus.bear === 'error' ? '失败'
                        : '保存'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">未配置</span>
                  )}
                </div>
                {!isBearReady && (
                  <div className="text-[10px] text-muted-foreground/70">
                    在「设置 &gt; 保存 &gt; Bear」中启用
                  </div>
                )}
                {saveErrors.bear && (
                  <div className="text-[10px] text-destructive">{saveErrors.bear}</div>
                )}
              </div>

              {/* Octarine */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isOctarineReady ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                    <span className="text-sm font-medium">Octarine</span>
                  </div>
                  {isOctarineReady ? (
                    <button
                      onClick={() => handleSaveToNotes('octarine')}
                      disabled={saveStatus.octarine === 'saving'}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        saveStatus.octarine === 'success'
                          ? 'bg-success/15 text-success'
                          : saveStatus.octarine === 'error'
                            ? 'bg-destructive/15 text-destructive'
                            : saveStatus.octarine === 'saving'
                              ? 'bg-muted text-muted-foreground opacity-50'
                              : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      {saveStatus.octarine === 'saving' ? '保存中…'
                        : saveStatus.octarine === 'success' ? '已保存'
                        : saveStatus.octarine === 'error' ? '失败'
                        : '保存'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">未配置</span>
                  )}
                </div>
                {isOctarineReady && (
                  <div className="text-[10px] text-muted-foreground/70">
                    {octarineSettings.workspace} / {octarineSettings.folder || 'plannotator'}/
                  </div>
                )}
                {!isOctarineReady && (
                  <div className="text-[10px] text-muted-foreground/70">
                    在「设置 &gt; 保存 &gt; Octarine」中启用
                  </div>
                )}
                {saveErrors.octarine && (
                  <div className="text-[10px] text-destructive">{saveErrors.octarine}</div>
                )}
              </div>

              {/* Notion */}
              {notionAvailable && (
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isNotionReady ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                      <span className="text-sm font-medium">Notion</span>
                    </div>
                    {isNotionReady ? (
                      <button
                        onClick={() => handleSaveToNotes('notion')}
                        disabled={saveStatus.notion === 'saving'}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          saveStatus.notion === 'success'
                            ? 'bg-success/15 text-success'
                            : saveStatus.notion === 'error'
                              ? 'bg-destructive/15 text-destructive'
                              : saveStatus.notion === 'saving'
                                ? 'bg-muted text-muted-foreground opacity-50'
                                : 'bg-primary text-primary-foreground hover:opacity-90'
                        }`}
                      >
                        {saveStatus.notion === 'saving' ? '保存中…'
                          : saveStatus.notion === 'success' ? '已保存'
                          : saveStatus.notion === 'error' ? '失败'
                          : '保存'}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">未配置</span>
                    )}
                  </div>
                  {isNotionReady && (
                    <div className="text-[10px] text-muted-foreground/70">
                      父页面：{notionParentPageId}
                    </div>
                  )}
                  {savedUrls.notion?.startsWith('https://') && (
                    <a
                      href={savedUrls.notion}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[10px] text-primary hover:underline truncate"
                    >
                      打开已保存页面
                    </a>
                  )}
                  {!isNotionReady && (
                    <div className="text-[10px] text-muted-foreground/70">
                      在「设置 &gt; 保存 &gt; Notion」中启用
                    </div>
                  )}
                  {saveErrors.notion && (
                    <div className="text-[10px] text-destructive">{saveErrors.notion}</div>
                  )}
                </div>
              )}

              {/* Save All button */}
              {readyCount >= 2 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus.obsidian === 'saving' || saveStatus.bear === 'saving' || saveStatus.octarine === 'saving' || saveStatus.notion === 'saving'}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    全部保存
                  </button>
                </div>
              )}
            </div>
          ) : (
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {annotationsOutput}
            </pre>
          )}
        </div>
        </OverlayScrollArea>

        {/* Footer actions - only show for Annotations tab */}
        {activeTab === 'annotations' && (
          <div className="p-4 border-t border-border flex justify-end gap-2">
            <button
              onClick={handleCopyAnnotations}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
            >
              {copied === 'annotations' ? '已复制！' : '复制'}
            </button>
            <button
              onClick={handleDownloadAnnotations}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              下载批注
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
