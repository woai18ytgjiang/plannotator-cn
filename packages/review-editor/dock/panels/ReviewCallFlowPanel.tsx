import React, { useEffect, useMemo, useState } from 'react';
import type { CallFlowAdvert, CallFlowInstallStage, CallFlowNode } from '@plannotator/shared/call-flow-types';
import { getCallFlowLanguage, type CallFlowLanguageId } from '@plannotator/shared/call-flow-languages';
import type { CallFlowInstallController } from '../../hooks/useCallFlowInstall';
import { Popover } from '@base-ui/react/popover';
import { Check, Info, Settings2, X } from 'lucide-react';
import { Tooltip } from '@plannotator/ui/components/Tooltip';
import { useReviewState } from '../ReviewStateContext';
import { useCallFlowNodeSource } from '../../hooks/useCallFlowNodeSource';
import {
  CallFlowTreeView,
  selectionForCallFlowNode,
} from '../../components/CallFlowTreeView';
import { CallFlowRawView } from '../../components/CallFlowRawView';
import { CallTreeList } from '../../components/callTree/CallTreeList';
import { callTreeFromEntry } from '@plannotator/shared/call-tree';
import { formatCallFlowInstallSize } from '../../utils/callFlowPresentation';

function errorMessage(error: Exclude<import('@plannotator/shared/call-flow-types').CallFlowResponse, { status: 'ok' }> | Error): string {
  return error.message || '调用流程分析失败。';
}

const INSTALL_STAGES: ReadonlyArray<{ id: CallFlowInstallStage; label: string }> = [
  { id: 'downloading', label: '正在下载固定版本的包' },
  { id: 'verifying', label: '正在校验包的完整性' },
  { id: 'installing-deps', label: '正在安装固定版本的依赖' },
  { id: 'building', label: '正在准备原生运行时' },
];

function isNodeInstallError(reason: string | undefined): boolean {
  return reason === 'node-unavailable' || reason === 'node-version';
}

function installFailedForLanguage(
  status: CallFlowInstallController['status'],
  languageId: CallFlowLanguageId,
): status is Extract<CallFlowInstallController['status'], { state: 'error' }> {
  if (status.state !== 'error') return false;
  if (status.currentLanguageId) return status.currentLanguageId === languageId;
  return status.languageIds?.includes(languageId) === true;
}

function installIncludesLanguage(
  status: CallFlowInstallController['status'],
  languageId: CallFlowLanguageId,
): boolean {
  return status.state === 'running' && status.languageIds.includes(languageId);
}

function CallFlowLanguagesMenu({
  languages,
  installable,
  install,
}: {
  readonly languages: NonNullable<CallFlowAdvert['languages']>;
  readonly installable: boolean;
  readonly install: CallFlowInstallController;
}) {
  const installed = languages.filter((language) => language.installed);
  const installedSize = installed.reduce((total, language) => total + language.installSizeBytes, 0);
  return (
    <Popover.Root>
      <Popover.Trigger render={
        <button
          type="button"
          className="call-flow-languages-trigger"
          aria-label={`Manage Call Flow languages. ${installed.length} of ${languages.length} installed.`}
          aria-busy={install.status.state === 'running'}
        />
      }>
        <Settings2 aria-hidden="true" size={14} strokeWidth={1.75} />
        <span>语言</span>
        <span className="call-flow-languages-trigger-count">{installed.length}/{languages.length}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="end" side="bottom" sideOffset={6} className="z-[110]">
          <Popover.Popup
            className="call-flow-languages-popover shadow-lg popover-enter"
            aria-label="调用流程语言支持"
          >
            <header className="call-flow-languages-popover-header">
              <div>
                <strong>语言支持</strong>
                <span>提前为下一次审查安装解析器。</span>
              </div>
              <span>{formatCallFlowInstallSize(installedSize)} installed</span>
            </header>
            <ul aria-live="polite">
              {languages.map((language) => {
                const languageInstallError = installFailedForLanguage(install.status, language.id)
                  ? install.status
                  : undefined;
                const languageInstalling = installIncludesLanguage(install.status, language.id);
                const requirement = language.required
                  ? `Needed for ${language.changedFiles} changed ${language.changedFiles === 1 ? 'file' : 'files'}`
                  : 'Available';
                return (
                  <li key={language.id}>
                    <span>
                      <strong>{language.label}</strong>
                      <small>
                        {language.installed
                          ? `Installed · ${formatCallFlowInstallSize(language.installSizeBytes)}`
                          : `${requirement} · ${formatCallFlowInstallSize(language.installSizeBytes)}`}
                      </small>
                      {languageInstalling && <small className="call-flow-language-progress">正在安装…</small>}
                      {languageInstallError && (
                        <small className="call-flow-language-error">Install failed: {languageInstallError.error}</small>
                      )}
                    </span>
                    {!language.installed
                      && language.kind === 'pack'
                      && installable
                      && !languageInstalling
                      && (
                      <button
                        type="button"
                        onClick={() => install.start([language.id])}
                        disabled={install.status.state === 'running'}
                      >
                        {languageInstallError ? 'Retry' : 'Install'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Background setup progress shown only for the runtime-missing flavor of an
 * unavailable advert. Never rendered for unsupported views or while the
 * feature is disabled. The toggle already captured consent, so the idle state
 * informs rather than asking for a second confirmation.
 */
export function CallFlowInstallFunnel({
  advert,
  install,
}: {
  readonly advert: CallFlowAdvert;
  readonly install: CallFlowInstallController;
}) {
  const { status } = install;
  if (status.state === 'running' || status.state === 'done') {
    const activeIndex = status.state === 'done'
      ? INSTALL_STAGES.length
      : INSTALL_STAGES.findIndex((stage) => stage.id === status.stage);
    return (
      <div className="call-flow-panel" aria-live="polite">
        <div className="call-flow-shell call-flow-install call-flow-empty" role="status">
          <span className="call-flow-empty-kicker">正在安装运行时</span>
          <strong>
            {status.state === 'done'
              ? '安装完成，正在开始调用流程分析。'
              : '正在设置调用流程运行时。'}
          </strong>
          {status.state === 'running' && status.currentLanguageId && (
            <p>{getCallFlowLanguage(status.currentLanguageId).label}</p>
          )}
          <ol className="call-flow-install-stages">
            {INSTALL_STAGES.map((stage, index) => {
              const stageState = index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending';
              return (
                <li key={stage.id} data-stage={stage.id} data-stage-state={stageState}>
                  {stageState === 'complete' ? (
                    <Check aria-hidden="true" size={13} strokeWidth={2} />
                  ) : stageState === 'active' ? (
                    <span className="call-flow-spinner call-flow-spinner-small" aria-hidden="true" />
                  ) : (
                    <span className="call-flow-install-stage-dot" aria-hidden="true" />
                  )}
                  <span>{stage.label}</span>
                  {stageState === 'active' && <span className="sr-only"> (in progress)</span>}
                </li>
              );
            })}
          </ol>
          <p>This can take a few minutes. The review stays fully usable while it runs.</p>
        </div>
      </div>
    );
  }
  if (status.state === 'error') {
    return (
      <div className="call-flow-panel">
        <div className="call-flow-shell call-flow-install call-flow-empty" role="alert">
          <span className="call-flow-empty-kicker">安装失败</span>
          <strong>{status.error}</strong>
          <p>
            {isNodeInstallError(status.reason)
              ? '请安装 Node.js 22.18 或更高版本，确保它在 PATH 中，然后重试。'
              : '未做任何更改。你可以随时重试安装。'}
          </p>
          <div className="call-flow-install-action">
            <button
              type="button"
              className="call-flow-install-cta"
              onClick={() => install.start(status.languageIds)}
            >
              重试安装
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="call-flow-panel">
      <div className="call-flow-shell call-flow-install call-flow-empty">
        <span className="call-flow-empty-kicker">正在准备分析</span>
        <strong>调用流程正在后台设置。</strong>
        <p>
          在 Plannotator 准备本地运行时和本次审查所需的语言支持时，你可以继续审查。
        </p>
        {advert.message && advert.reason !== 'runtime-unavailable' && (
          <p className="call-flow-install-detail">{advert.message}</p>
        )}
        {advert.installPlan && (
          <p className="call-flow-install-disclosure">
            Installing <strong>{advert.installPlan.labels.join(', ')}</strong>,{' '}
            <strong>{formatCallFlowInstallSize(advert.installPlan.installSizeBytes)}</strong> on disk.
            {' '}Requires Node.js 22.18 or newer. Other languages install automatically, only
            when a review needs them.
          </p>
        )}
      </div>
    </div>
  );
}

export function ReviewCallFlowPanel() {
  const state = useReviewState();
  const loadNodeSource = useCallFlowNodeSource(state);
  const analysis = state.callFlowAnalysis;
  // The tab opens on the Call tree (owner, 2026-11-10, once the tree had search); Paths and Raw stay one click away.
  const [view, setView] = useState<'paths' | 'tree' | 'raw'>('tree');
  const callTreeRequest = state.callTreeRequest ?? null;
  // A hunk's "Call tree" entry shows its tree here.
  useEffect(() => {
    if (callTreeRequest) setView('tree');
  }, [callTreeRequest]);
  const readyData = analysis.status === 'ready' ? analysis.data : null;
  const entryDocs = useMemo(
    () => (readyData ? readyData.trees.map((tree, index) => callTreeFromEntry(tree, index, { from: readyData.from, to: readyData.to })) : []),
    [readyData],
  );
  const entryTrees = useMemo(() => entryDocs.map((doc) => ({ key: doc.rootPath, doc })), [entryDocs]);

  const openNode = (node: CallFlowNode) => {
    if (!node.file) return;
    state.openDiffFile(node.file);
    state.onLineSelection(selectionForCallFlowNode(node));
  };
  const openTreeNode = state.openCallTreeNode ?? openNode;
  if (!state.callFlowAdvert.available) {
    // The runtime-missing flavor of unavailable is the setup progress surface.
    // Unsupported views and the disabled state never offer the install.
    if (state.callFlowAdvert.state === 'unavailable' && state.callFlowAdvert.installable && state.callFlowAdvert.installPlan) {
      return <CallFlowInstallFunnel advert={state.callFlowAdvert} install={state.callFlowInstall} />;
    }
    const recovery = state.callFlowAdvert.state === 'unsupported'
      ? state.callFlowAdvert.reason === 'demo-mode'
        ? '通过 Plannotator 启动审查，即可分析其 Git 快照。'
        : '选择受支持的本地 Git 审查视图来运行此分析。'
      : '常规代码差异仍可使用。';
    return (
      <div className="call-flow-panel">
        <div className="call-flow-shell call-flow-empty" role="status">
          <span className="call-flow-empty-kicker">
            {state.callFlowAdvert.state === 'unsupported' ? '此视图不支持' : '调用流程不可用'}
          </span>
          <strong>{state.callFlowAdvert.message ?? '调用流程不可用。'}</strong>
          <p>{recovery}</p>
        </div>
      </div>
    );
  }
  if (analysis.status === 'idle' || analysis.status === 'loading') {
    return (
      <div className="call-flow-panel" aria-live="polite">
        <div className="call-flow-shell">
          <div className="call-flow-loading">
            <span className="call-flow-spinner" aria-hidden="true" />
            <div>
              <strong>正在追踪更改的调用…</strong>
              <span>Comparing complete Git snapshots in an isolated worker.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (analysis.status === 'error') {
    return (
      <div className="call-flow-panel">
        <div className="call-flow-shell call-flow-empty" role="alert">
          <span className="call-flow-empty-kicker">调用流程不可用</span>
          <strong>{errorMessage(analysis.error)}</strong>
          <p>代码差异仍然可用，且未改动任何仓库文件。如果分析超时，请稍等片刻后重试。</p>
          <button type="button" className="call-flow-retry" onClick={state.retryCallFlowAnalysis}>
            重试分析
          </button>
        </div>
      </div>
    );
  }

  const { data } = analysis;
  const skippedFileCount = data.skippedLanguages.reduce((total, language) => total + language.files.length, 0);
  const skippedInstallError = state.callFlowInstall.status.state === 'error'
    && data.skippedLanguages.some((language) => installFailedForLanguage(state.callFlowInstall.status, language.id))
      ? state.callFlowInstall.status
      : undefined;
  const skippedLanguageIds = data.skippedLanguages.map((language) => language.id);
  const skippedInstallRunning = skippedLanguageIds.some((languageId) => (
    installIncludesLanguage(state.callFlowInstall.status, languageId)
  ));
  const retrySkipped = () => state.callFlowInstall.start(skippedLanguageIds);
  return (
    <div className="call-flow-panel">
      <div className="call-flow-shell">
        <header className="call-flow-header">
          <div>
            <h2>{data.summary.changedNodes === 0 ? '没有更改的调用路径' : '调用路径'}</h2>
            {/* The items are spaced by CSS gap; the hidden ", " keeps them apart when read aloud. */}
            <p className="call-flow-summary">
              {data.summary.added > 0 && (
                <span className="call-flow-summary-item call-flow-summary-changed">
                  <span className="call-flow-marker call-flow-marker-added" aria-hidden="true" />
                  {data.summary.added.toLocaleString()} new
                </span>
              )}
              {data.summary.removed > 0 && (
                <span className="call-flow-summary-item call-flow-summary-changed">
                  {data.summary.added > 0 && <span className="sr-only">, </span>}
                  <span className="call-flow-marker call-flow-marker-removed" aria-hidden="true" />
                  {data.summary.removed.toLocaleString()} removed
                </span>
              )}
              <span className="call-flow-summary-item">
                {(data.summary.added > 0 || data.summary.removed > 0) && <span className="sr-only">, </span>}
                {data.summary.impactedFiles.toLocaleString()} {data.summary.impactedFiles === 1 ? 'file' : 'files'}
              </span>
              <span className="call-flow-summary-item">
                <span className="sr-only">, </span>
                {data.summary.entries.toLocaleString()} {data.summary.entries === 1 ? 'entry' : 'entries'}
              </span>
            </p>
          </div>
          <div className="call-flow-header-actions">
            <div className="call-flow-view-switch" aria-label="调用流程视图">
              <button type="button" aria-pressed={view === 'tree'} onClick={() => setView('tree')}>调用树</button>
              <button type="button" aria-pressed={view === 'paths'} onClick={() => setView('paths')}>路径</button>
              <button type="button" aria-pressed={view === 'raw'} onClick={() => setView('raw')}>原始</button>
            </div>
            {state.callFlowAdvert.languages && (
              <CallFlowLanguagesMenu
                languages={state.callFlowAdvert.languages}
                installable={state.callFlowAdvert.installable}
                install={state.callFlowInstall}
              />
            )}
            <Tooltip
              content={`Generated by CallDiff ${data.version}. Syntactic analysis of ${data.from} to ${data.to}; not a runtime trace.`}
              side="bottom"
              align="end"
              wide
            >
              <button type="button" className="call-flow-info" aria-label="调用流程分析详情">
                <Info aria-hidden="true" size={15} strokeWidth={1.75} />
              </button>
            </Tooltip>
          </div>
        </header>

        {view === 'paths' && (
          <div className="call-flow-legend" aria-label="调用流程图例">
            <span className="call-flow-legend-key">
              <span className="call-flow-marker call-flow-marker-same" aria-hidden="true" /> unchanged
            </span>
            <span className="call-flow-legend-hint">Click a call to comment, Shift-click to add steps. Click a location to open it.</span>
          </div>
        )}

        {data.skippedLanguages.length > 0 && (
          <div className="call-flow-language-notice" role="status">
            <span>
              {skippedFileCount} {skippedFileCount === 1 ? 'file' : 'files'} skipped:{' '}
              {data.skippedLanguages.map((language) => language.label).join(', ')} support not installed
              {' '}({formatCallFlowInstallSize(data.skippedLanguages.reduce((total, language) => total + language.installSizeBytes, 0))}).
              {skippedInstallRunning && (
                <small className="call-flow-language-progress">正在后台安装支持…</small>
              )}
              {skippedInstallError && (
                <small className="call-flow-language-error">Install failed: {skippedInstallError.error}</small>
              )}
              {!state.callFlowAdvert.installable && (
                <small className="call-flow-language-progress">
                  将此语言语法加入 PLANNOTATOR_CALLDIFF_PATH 即可包含这些文件。
                </small>
              )}
            </span>
            {state.callFlowAdvert.installable && skippedInstallError && (
              <button
                type="button"
                onClick={retrySkipped}
              >
                重试
              </button>
            )}
          </div>
        )}

        {view === 'tree' && callTreeRequest ? (
          <CallTreeList
            key={`${callTreeRequest.doc.rootPath}:${callTreeRequest.token}`}
            trees={[{
              key: callTreeRequest.doc.rootPath,
              doc: callTreeRequest.doc,
              ...(state.returnFromCallTree ? { onBack: state.returnFromCallTree } : {}),
              autoFocus: true,
              headerAccessory: state.clearCallTreeRequest && (
                <button
                  type="button"
                  className="call-flow-icon-button"
                  aria-label="关闭"
                  title="关闭"
                  onClick={state.clearCallTreeRequest}
                >
                  <X aria-hidden="true" size={14} />
                </button>
              ),
            }]}
            onOpen={openTreeNode}
            loadNodeSource={loadNodeSource}
            onAnnotateTargets={state.onAddCallFlowAnnotation}
            findShortcutActive={state.isCallFlowActive}
          />
        ) : view === 'tree' ? (
          data.trees.length === 0 ? (
            <div className="call-flow-empty">
              <span className="call-flow-empty-kicker">快照在结构上一致</span>
              <strong>{data.message ?? 'CallDiff 没有找到更改的调用路径。'}</strong>
              <p>This is syntactic call analysis; the ordinary and semantic diffs may still contain changes.</p>
            </div>
          ) : (
            <CallTreeList
              trees={entryTrees}
              onOpen={openTreeNode}
              loadNodeSource={loadNodeSource}
              onAnnotateTargets={state.onAddCallFlowAnnotation}
              findShortcutActive={state.isCallFlowActive}
            />
          )
        ) : view === 'raw' ? (
          <CallFlowRawView
            sections={[{ key: 'complete', raw: data.raw, rawLineStart: 1 }]}
            onAnnotateTargets={state.onAddCallFlowAnnotation}
            findShortcutActive={state.isCallFlowActive}
          />
        ) : data.trees.length === 0 ? (
          <div className="call-flow-empty">
            <span className="call-flow-empty-kicker">快照在结构上一致</span>
            <strong>{data.message ?? 'CallDiff 没有找到更改的调用路径。'}</strong>
            <p>This is syntactic call analysis; the ordinary and semantic diffs may still contain changes.</p>
          </div>
        ) : (
          <CallFlowTreeView
            trees={data.trees}
            onOpenNode={openNode}
            loadNodeSource={loadNodeSource}
            onAnnotateTargets={state.onAddCallFlowAnnotation}
            canInteractWithNode={state.isCallFlowNodeInPatch}
            findShortcutActive={state.isCallFlowActive}
          />
        )}

        {data.diagnostics.length > 0 && (
          <details className="call-flow-diagnostics">
            <summary>{data.diagnostics.length} parser {data.diagnostics.length === 1 ? 'notice' : 'notices'}</summary>
            <ul>{data.diagnostics.map((diagnostic, index) => <li key={`${diagnostic.message}:${index}`}>{diagnostic.message}</li>)}</ul>
          </details>
        )}

      </div>
    </div>
  );
}
