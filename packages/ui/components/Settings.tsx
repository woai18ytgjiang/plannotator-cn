// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import { DiffDisplayOptionsBody } from './DiffDisplayOptions';
import type { UpdateCheckSetting } from '../hooks/useUpdateCheckSetting';
import { cookieHostDescription, type CookieHostSetting } from '../hooks/useCookieHostSetting';
import type { PackageChangesSetting } from '../hooks/usePackageChangesSetting';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AnnotateAgentTerminalSide } from '@plannotator/core/agent-terminal';
import type { Origin } from '@plannotator/core/agents';
import type { TokenHoverDelay } from '@plannotator/core/token-hover';
import { basenameFromPath } from '@plannotator/core/source-save';
import {
  configStore,
  useConfigValue,
  setReviewPanelView,
  setReviewDefaultDiffType,
  getProviderReviewDefaultDiffType,
  setProviderReviewDefaultDiffType,
  setReviewAutoViewed,
  type VcsReviewSettingsDescriptor,
} from '../config';
import { setWebMcpToolsEnabled, useWebMcpToolsEnabled } from '../webmcp/preference';
import { DIAGRAM_SHADOW_OPTIONS } from '../utils/diagramShadow';
import { markLookAndFeelChoiceResolved } from '../utils/lookAndFeelAnnouncement';
import { DEFAULT_DOCUMENT_TEXT_SIZE, DOCUMENT_TEXT_SIZE_OPTIONS } from '../utils/documentTextSize';
import { DOCUMENT_FONT_OPTIONS, documentFontStack } from '../utils/documentFont';
import {
  agentToolAppliesWhen,
  agentToolCostNote,
  agentToolHostName,
  type AgentToolSetting,
} from '../utils/agentToolSetting';
import { loadDiffFont } from '../utils/diffFonts';
import { isFontInstalled } from '../utils/fontDetect';
import { MAX_FONT_FAMILY_LENGTH, monoFontStack, normalizeCssFontSize, normalizeFontFamilyName } from '../utils/cssFontFamily';
import { TaterSpritePullup } from './TaterSpritePullup';
import { getIdentity, regenerateIdentity, setCustomIdentity, isIdentityEditable } from '../utils/identity';
import { GitUser } from '../icons/GitUser';
import {
  getObsidianSettings,
  saveObsidianSettings,
  getEffectiveVaultPath,
  CUSTOM_PATH_SENTINEL,
  DEFAULT_FILENAME_FORMAT,
  type ObsidianSettings,
} from '../utils/obsidian';
import {
  getBearSettings,
  saveBearSettings,
  normalizeTags,
  type BearSettings,
} from '../utils/bear';
import {
  getOctarineSettings,
  saveOctarineSettings,
  type OctarineSettings,
} from '../utils/octarine';
import {
  getNotionSettings,
  saveNotionSettings,
  getNotionParentPageId,
  isNotionAvailable,
  type NotionSettings,
} from '../utils/notion';
import {
  getAgentSwitchSettings,
  getAgentSwitchDefaults,
  saveAgentSwitchSettings,
  AGENT_OPTIONS,
  type AgentSwitchSettings,
  type AgentSwitchSurface,
} from '../utils/agentSwitch';
import {
  getPlanSaveSettings,
  savePlanSaveSettings,
  type PlanSaveSettings,
} from '../utils/planSave';
import {
  getUIPreferences,
  saveUIPreferences,
  PLAN_WIDTH_OPTIONS,
  type UIPreferences,
  type PlanWidth,
} from '../utils/uiPreferences';
import {
  getPermissionModeSettings,
  savePermissionModeSettings,
  PERMISSION_MODE_OPTIONS,
  type PermissionMode,
} from '../utils/permissionMode';
import { getAutoCloseDelay, setAutoCloseDelay, AUTO_CLOSE_OPTIONS, type AutoCloseDelay } from '../utils/storage';
import {
  getDefaultNotesApp,
  saveDefaultNotesApp,
  type DefaultNotesApp,
} from '../utils/defaultNotesApp';
import { useAgents } from '../hooks/useAgents';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { ThemeTab } from './ThemeTab';
import { modKey, modKeyWord } from '../utils/platform';
import { getAIProviderSettings, resolveAIProviderSelection } from '../utils/aiProvider';
import { AISettingsTab } from './AISettingsTab';
import { HooksTab } from './settings/HooksTab';
import { QuickLabelsTab } from './settings/QuickLabelsTab';
import { OverlayScrollArea } from './OverlayScrollArea';
import {
  getFileBrowserSettings,
  saveFileBrowserSettings,
  type FileBrowserSettings,
} from '../utils/fileBrowser';
import { requestVimDocumentFocus } from '../hooks/useVimDocumentFocus';
import { AnalysisLayerToggle } from './AnalysisLayerToggle';
import { SemanticDiffsTab } from './settings/SemanticDiffsTab';

type SettingsTab = 'general' | 'theme' | 'review' | 'display' | 'semantic' | 'analysis' | 'saving' | 'labels' | 'vim' | 'shortcuts' | 'ai' | 'files' | 'obsidian' | 'bear' | 'octarine' | 'notion' | 'comments' | 'hooks' | 'experimental';

interface SettingsProps {
  taterMode: boolean;
  onTaterModeChange: (enabled: boolean) => void;
  onIdentityChange?: (oldIdentity: string, newIdentity: string) => void;
  origin?: Origin | null;
  mode?: 'plan' | 'annotate' | 'review';
  /**
   * `mode="annotate"` only: offer the document tabs plan review has (Display,
   * Saving, Labels, and the Obsidian / Bear / Octarine integrations) and hide
   * the plan-only OpenCode agent-switch row. Plannotator's annotate app passes
   * true; a host that omits it keeps the pre-parity annotate tab set.
   */
  annotateParity?: boolean;
  /**
   * Hide General's "Enter saves a comment" row (#1934). Default false: the
   * row shows. A host that drives the `enterSavesComment` setting itself, or
   * never wants it offered, passes true.
   */
  hideEnterSavesComment?: boolean;
  /**
   * Hide General's "Hide the repository owner" row. Default false: the row
   * shows. A host that never shows a repository label, or drives the
   * `hideRepoOwner` setting itself, passes true. (Not `hide` + the setting's
   * name, which would read `hideHideRepoOwner`.)
   */
  hideRepoOwnerSetting?: boolean;
  /**
   * Show Display's Text size row (#2066). Default false: the row does
   * something only where the page applies the `documentTextSize` setting
   * (`hooks/useDocumentTextSize`), so a host opts in. Plannotator passes true
   * in plan review and annotate on a markdown or text document.
   */
  showDocumentTextSize?: boolean;
  /**
   * Show Display's Document font row (#1657). Default false, like
   * `showDocumentTextSize`: the row does something only where the page
   * applies the `documentFontFamily` setting (`hooks/useDocumentFont`).
   */
  showDocumentFont?: boolean;
  onUIPreferencesChange?: (prefs: UIPreferences) => void;
  /** Claude Code's permission mode was changed here (plan review). The host
   *  keeps its own copy in step, since its Approve sends the mode and its
   *  decision menu shows it. Optional: hosts that omit it are unchanged. */
  onPermissionModeChange?: (mode: PermissionMode) => void;
  /** Externally controlled open state (for mobile menu integration) */
  externalOpen?: boolean;
  externalTab?: 'semantic';
  onExternalClose?: () => void;
  /** Available AI providers (from /api/ai/capabilities). */
  aiProviders?: Array<{ id: string; name: string; capabilities: Record<string, boolean>; models?: Array<{ id: string; label: string; default?: boolean }> }>;
  /** Git user name from `git config user.name`, for quick identity set */
  gitUser?: string;
  /** Present when the server advertises the auto-update setting (#1634);
   *  `env` is PLANNOTATOR_AUTO_UPDATE when it overrides the config file.
   *  Hosts that omit it get no toggle. */
  autoUpdateSetting?: { env?: boolean };
  /** Present when the server reports the update-notice switch (serverConfig.updateCheck,
   *  useUpdateCheckSetting); `env` is PLANNOTATOR_UPDATE_CHECK when it overrides the
   *  config file. Hosts that omit it get no row. */
  updateCheckSetting?: UpdateCheckSetting;
  /** "Open Plannotator at plannotator.localhost" (#2184, useCookieHostSetting): present
   *  only when the server reports it (a local session). Hosts that omit it get no row. */
  cookieHostSetting?: CookieHostSetting;
  /** Code review's package changes switches (usePackageChangesSetting). Hosts that omit it get no rows. */
  packageChangesSetting?: PackageChangesSetting;
  /** The `plannotator` agent tool switch, as the server reports it
   *  (parseAgentToolSetting of serverConfig: present only when the session's
   *  host registers the tool). Shown only together with onAgentToolChange;
   *  hosts that omit them get no row. */
  agentToolSetting?: AgentToolSetting;
  /** Saves the agent tool switch (saveAgentToolSetting); rejects with a
   *  readable Error, which the row shows. */
  onAgentToolChange?: (enabled: boolean) => Promise<void>;
  /** Current session is a local git review where since-base ISN'T offered
   *  (base ref unresolvable) — the Review tab's Git section shows a note that
   *  the Git-status preference can't take effect in THIS repo. */
  sinceBaseUnavailable?: boolean;
  /** The host is rendering its compact touch shell (review only). Display
   *  settings that the compact shell overrides for the session are hidden
   *  there instead of silently editing the desktop preference. */
  isCompactTouchLayout?: boolean;
  /** Override Obsidian vault detection (default = GET /api/obsidian/vaults). */
  onDetectObsidianVaults?: () => Promise<string[]>;
  /** This annotate session actually offers the Agent TUI, so its Position
   *  setting is worth showing. Default false: the setting is the only way back
   *  from a Hidden position, but offering it where no terminal can ever run
   *  would just be a dead control. */
  agentTerminalAvailable?: boolean;
  /** The browser exposes WebMCP (`document.modelContext`), so the "Agent
   *  tools" opt-out is worth showing. Default false: a browser without the
   *  API gets no row at all (the provider registers nothing there). */
  webmcpAvailable?: boolean;
}

// --- Review-mode Display tab (diff display options) ---

const DIFF_FONT_OPTIONS = [
  { value: '', label: '主题默认' },
  { value: 'Fira Code', label: 'Fira Code' },
  { value: 'Hack', label: 'Hack' },
  { value: 'IBM Plex Mono', label: 'IBM Plex Mono' },
  { value: 'Inconsolata', label: 'Inconsolata' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'Red Hat Mono', label: 'Red Hat Mono' },
  { value: 'Roboto Mono', label: 'Roboto Mono' },
  { value: 'Source Code Pro', label: 'Source Code Pro' },
  { value: 'Atkinson Hyperlegible Mono', label: 'Atkinson Hyperlegible' },
];

/**
 * The modifier gate is the platform's primary modifier: Cmd on macOS, Ctrl on
 * Windows and Linux. Labeled through modKeyWord so the control names the key
 * the reader actually has.
 */
export const TOKEN_HOVER_TRIGGER_OPTIONS = [
  { value: 'hover' as const, label: '悬停时' },
  { value: 'modifier' as const, label: `按住 ${modKeyWord}` },
  { value: 'off' as const, label: '关闭' },
];
/** SegmentedControl keys on strings, so the ms values ride as their digits. */
export type TokenHoverDelayOption = '150' | '300' | '700';
export const TOKEN_HOVER_DELAY_OPTIONS = [
  { value: '150' as const, label: '快' },
  { value: '300' as const, label: '默认' },
  { value: '700' as const, label: '慢' },
];
const DEFAULT_DIFF_TYPE_OPTIONS = [
  // "All Changes" belongs to since-base (the flagship composite); uncommitted
  // reverts to its plain name so the two stay distinguishable side by side.
  { value: 'since-base' as const, label: '所有更改（推荐）', description: "自你的分支从 main 分出以来的所有内容——已提交、未提交和未跟踪的更改" },
  { value: 'local-vs-remote' as const, label: '本地分支与远程分支', description: "将本地分支和工作区与最近一次抓取的远程跟踪分支进行比较" },
  { value: 'uncommitted' as const, label: '未提交', description: "自上次提交以来的所有更改" },
  { value: 'unstaged' as const, label: '未暂存', description: "仅包含你尚未暂存的更改" },
  { value: 'staged' as const, label: '已暂存', description: "仅包含你已暂存待提交的更改" },
  { value: 'merge-base' as const, label: '已提交的更改（PR 视图）', description: "你在此分支上提交的所有内容" },
  { value: 'all' as const, label: '所有文件（HEAD）', description: "HEAD 处所有已跟踪文件，以新增形式展示" },
];
// Labels match the jj diff picker (getJjContext in packages/shared/jj-core.ts).
const JJ_DEFAULT_DIFF_TYPE_OPTIONS = [
  { value: 'jj-current', label: '当前更改', description: '仅工作副本的更改（@）' },
  { value: 'jj-last', label: '上一次更改', description: '紧邻工作副本之前的更改（@-）' },
  { value: 'jj-line', label: '工作线', description: '你的工作线自主干分出以来的所有更改' },
  { value: 'jj-evolog', label: '演进差异', description: '当前更改的演进过程' },
  { value: 'jj-all', label: '所有文件', description: '工作副本中的所有文件，以新增形式展示' },
] as const;
const JJ_REVIEW_DEFAULTS: VcsReviewSettingsDescriptor = {
  id: 'jj',
  label: 'Jujutsu',
  defaultDiffType: 'jj-current',
  diffOptions: JJ_DEFAULT_DIFF_TYPE_OPTIONS.map(({ value, label, description }) => ({ id: value, label, description })),
};
const AGENT_TERMINAL_SIDE_OPTIONS: { value: AnnotateAgentTerminalSide; label: string }[] = [
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' },
  { value: 'hidden', label: '隐藏' },
];

function SegmentedControl<T extends string>({ options, value, onChange, disabled = false }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Visible but inert, for a control whose axis does not apply right now. */
  disabled?: boolean;
}) {
  return (
    <div className={['flex items-center gap-1 bg-muted/50 rounded-lg p-0.5', disabled && 'opacity-50'].filter(Boolean).join(' ')}>
      {options.map((opt) => (
        <button
          key={opt.value}
          {...(disabled ? { disabled: true } : {})}
          onClick={() => onChange(opt.value)}
          className={[
            'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors',
            disabled && 'cursor-not-allowed',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground',
          ].filter(Boolean).join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Which of the cookie switch's states the row shows (a test and screenshot hook). */
function cookieHostSettingState(setting: CookieHostSetting): string {
  if (setting.env !== undefined) return 'locked-env';
  if (setting.urlHost !== undefined) return 'locked-url-host';
  return setting.on ? 'on' : 'off';
}

function ToggleSwitch({ checked, onChange, label, description, disabled = false }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-11 w-11 shrink-0 items-center disabled:cursor-not-allowed"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-2.5 h-6 rounded-full transition-colors ${
            checked ? 'bg-primary' : 'bg-muted'
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute top-3.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/**
 * The `plannotator` agent tool switch. The value is the one the NEXT session
 * uses (the tool list is part of the model's prompt, so a running session
 * never changes it). Writes go straight to POST /api/config and wait for the
 * answer, so a failed save is reported and the switch stays where it was.
 */
function AgentToolSettingRow({ setting, onChange }: {
  readonly setting: AgentToolSetting;
  readonly onChange: (enabled: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = setting.env !== undefined;
  const change = async (next: boolean) => {
    if (saving || locked) return;
    setSaving(true);
    setError(null);
    try {
      await onChange(next);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : '无法保存该设置。');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div data-agent-tool-setting={setting.host} aria-busy={saving}>
      <ToggleSwitch
        checked={setting.enabled}
        onChange={(next) => void change(next)}
        disabled={locked}
        label="允许智能体自行打开审查（plannotator 工具）"
        description={
          locked
            ? `由环境变量 PLANNOTATOR_AGENT_TOOL 设定，因此此处为${setting.enabled ? '开启' : '关闭'}状态。`
            : `${agentToolHostName(setting.host)} 可以自行打开审查并继续工作。${agentToolCostNote(setting.host)} 从${agentToolAppliesWhen(setting.host)}起生效。`
        }
      />
      {error && (
        <p role="alert" data-agent-tool-setting-error className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface VimSettingsTabProps {
  readonly vimModeEnabled: boolean;
  readonly vimHudEnabled: boolean;
  readonly vimHudKeyPanelEnabled: boolean;
  readonly onVimModeChange: (enabled: boolean) => void;
  readonly onVimHudChange: (enabled: boolean) => void;
  readonly onVimHudKeyPanelChange: (enabled: boolean) => void;
}

/** First-class Vim configuration, separate from the shortcut reference. */
function VimSettingsTab({
  vimModeEnabled,
  vimHudEnabled,
  vimHudKeyPanelEnabled,
  onVimModeChange,
  onVimHudChange,
  onVimHudKeyPanelChange,
}: VimSettingsTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold">Vim 模式</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          无需使用鼠标即可浏览、选择并批注渲染后的文档。
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
        <ToggleSwitch
          checked={vimModeEnabled}
          onChange={onVimModeChange}
          label="Vim 控制"
          description="使用 Vim 风格按键浏览文档和添加批注。默认关闭。"
        />
        <div className="border-t border-border" />
        <ToggleSwitch
          checked={vimModeEnabled && vimHudEnabled}
          onChange={onVimHudChange}
          label="Vim HUD"
          description={
            vimModeEnabled
              ? '显示四角目标准星和导航上下文。'
              : '请先启用 Vim 控制，以使用目标准星。'
          }
          disabled={!vimModeEnabled}
        />
        <div className="border-t border-border" />
        <ToggleSwitch
          checked={vimModeEnabled && vimHudEnabled && vimHudKeyPanelEnabled}
          onChange={onVimHudKeyPanelChange}
          label="按键面板"
          description={
            vimModeEnabled && vimHudEnabled
              ? '显示右下角的实时按键图例和命令面板。'
              : '请先启用 Vim HUD，以使用实时按键图例。'
          }
          disabled={!vimModeEnabled || !vimHudEnabled}
        />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-xs font-bold text-primary">
            ?
          </span>
          <div>
            <div className="text-xs font-semibold">边浏览边学习</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              页面就绪后 Vim 会自动获得焦点。若要操作其他控件，按{' '}
              <span className="font-mono text-foreground">Esc</span> 回到文档，然后用{' '}
              <span className="font-mono text-foreground">j</span> 和{' '}
              <span className="font-mono text-foreground">k</span> 按块移动。按{' '}
              <span className="font-mono text-foreground">?</span> 可查看完整键位表，
              即使按键面板已隐藏。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewAnalysisTab({ packageChangesSetting }: { packageChangesSetting?: PackageChangesSetting }) {
  const semanticDiffEnabled = useConfigValue('semanticDiffEnabled');
  const callFlowEnabled = useConfigValue('callFlowEnabled');
  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold">分析层</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          为普通代码差异补充结构化上下文。各层相互独立，停用时不做任何处理。
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
        <AnalysisLayerToggle
          checked={semanticDiffEnabled}
          onChange={(enabled) => configStore.set('semanticDiffEnabled', enabled)}
          label="语义变更"
          description="整理新增、修改、移动和删除的函数、类及其他具名代码。默认启用。"
        />
        <div className="border-t border-border" />
        <AnalysisLayerToggle
          checked={callFlowEnabled}
          onChange={(enabled) => configStore.set('callFlowEnabled', enabled)}
          label="调用流"
          description="跨 git 提交的函数调用栈差异。支持 22 种语言（基于 AST，使用 Tree-sitter 构建）。"
        />
        {packageChangesSetting && (
          <>
            <div className="border-t border-border" />
            <AnalysisLayerToggle
              checked={packageChangesSetting.card}
              onChange={(on) => packageChangesSetting.setCard(on)}
              label="依赖包变更"
              description="在 package.json 和 lockfile 差异上方显示新增、删除和变更的依赖。"
            />
            <div className="border-t border-border" />
            <AnalysisLayerToggle
              checked={packageChangesSetting.lookup}
              onChange={(on) => void packageChangesSetting.setLookup(on)}
              disabled={packageChangesSetting.lookupEnv === false}
              label="在 npm 上查询依赖包"
              description={packageChangesSetting.lookupEnv === false
                ? '已关闭：PLANNOTATOR_PACKAGE_LOOKUP=0。'
                : '许可证、发布日期和每周下载量。会将变更的公开包名称发送到 registry.npmjs.org 和 api.npmjs.org。'}
            />
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 font-mono text-primary">▣</span>
            停靠面板
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            从文件面板打开完整分析。点击行可跳转到相关代码位置。
          </p>
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 font-mono text-primary">⌁</span>
            文件透镜
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            文件头部显示精简统计，并为该文件提供聚焦浮层。
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-warning/25 bg-warning/[0.05] p-4 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">调用流基于语法分析。</span>{' '}
        它不使用类型解析或运行时追踪，因此只能作为导航上下文，不能证明某条路径一定会执行。
      </div>
    </div>
  );
}

/** One radio card list for a saved default diff (Git or Jujutsu). */
function DefaultDiffChoices<T extends string>({ options, value, onChange }: {
  options: ReadonlyArray<{ value: T; label: string; description: string }>;
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
            value === opt.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
          }`}
        >
          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
            value === opt.value ? 'border-primary' : 'border-muted-foreground/40'
          }`}>
            {value === opt.value && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

const REVIEW_SECTION_HEADING = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground';

const ReviewTab: React.FC<{ sinceBaseUnavailable?: boolean }> = ({ sinceBaseUnavailable }) => {
  const defaultDiffType = useConfigValue('defaultDiffType');
  useConfigValue('reviewDefaults');
  const jjDefaultDiffType = getProviderReviewDefaultDiffType(JJ_REVIEW_DEFAULTS);
  const reviewPanelView = useConfigValue('reviewPanelView');
  const reviewAutoViewed = useConfigValue('reviewAutoViewed');
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className={REVIEW_SECTION_HEADING}>已查看文件</div>
        {/* Never write `reviewAutoViewed` directly — setReviewAutoViewed also
            consumes the first-time notice, since an explicit toggle is proof
            the reviewer already found the switch. */}
        <ToggleSwitch
          checked={reviewAutoViewed}
          onChange={(v) => setReviewAutoViewed(v)}
          label="自动标记为已查看"
          description="滚过某个文件或切换到其他文件时，将其标记为已查看。你手动取消查看的文件会保持未查看，刷新后发生变化的文件也会变回未查看。"
        />
      </div>

      <div className="border-t border-border" />

      <section className="space-y-4" aria-labelledby="settings-review-git">
        <div id="settings-review-git" className={REVIEW_SECTION_HEADING}>Git</div>
        <div className="space-y-2">
          <div>
            <div className="text-sm font-medium">默认文件分组</div>
            <div className="text-xs text-muted-foreground">打开代码审查时，文件树如何对其中的文件分组</div>
            {/* This is a GLOBAL preference — never hide the options because the
                CURRENT repo can't serve them; just say so. Without this note,
                picking Git status on a repo whose base ref doesn't resolve
                silently falls back to Tree and the setting looks broken. */}
            {sinceBaseUnavailable && (
              <div className="text-xs text-warning mt-1">
                此仓库无法按 git 状态分组（无法解析其基准分支），因此这里的审查会按类型分组打开。该偏好设置在其他可用的仓库中仍然生效。
              </div>
            )}
          </div>
          {/* No Commits option here: the Commits view is session-only (entered
              via the panel toggle) and is never the opening view. */}
          <SegmentedControl
            options={[
              { value: 'sections' as const, label: '按 git 状态' },
              { value: 'tree' as const, label: '按类型' },
            ]}
            value={reviewPanelView}
            onChange={setReviewPanelView}
          />
        </div>
        <div className="space-y-2">
          <div>
            <div className="text-sm font-medium">默认差异视图</div>
            <div className="text-xs text-muted-foreground">打开代码审查时显示哪些更改</div>
          </div>
          {/* Coupling (sections ⟺ since-base) lives in the shared setter —
              never write the pair by hand (see config/reviewView). */}
          <DefaultDiffChoices
            options={DEFAULT_DIFF_TYPE_OPTIONS}
            value={defaultDiffType}
            onChange={(value) => setReviewDefaultDiffType(value)}
          />
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="space-y-4" aria-labelledby="settings-review-jj">
        <div id="settings-review-jj" className={REVIEW_SECTION_HEADING}>Jujutsu</div>
        <div className="space-y-2">
          <div>
            <div className="text-sm font-medium">默认差异视图</div>
            <div className="text-xs text-muted-foreground">在 Jujutsu 仓库中打开审查时显示哪些更改</div>
          </div>
          {/* Its own saved value: Git modes mean nothing in a jj repo, and jj has
              no Git status view, so nothing here is coupled to the Git half. */}
          <DefaultDiffChoices
            options={JJ_DEFAULT_DIFF_TYPE_OPTIONS}
            value={jjDefaultDiffType}
            onChange={(value) => setProviderReviewDefaultDiffType('jj', value)}
          />
        </div>
      </section>
    </div>
  );
};

/** Sentinel for the "Custom…" select option — never persisted as a font name. */
const CUSTOM_FONT_SENTINEL = '__custom__';

/** Inline style rendering a control in the chosen font (quoted and escaped: free text). */
function stackStyle(stack: string): React.CSSProperties | undefined {
  return stack ? { fontFamily: stack } : undefined;
}

/**
 * A font row (#851, shared by Code Font and Document font): a select of the
 * built-in choices plus "Custom…", which opens a field for the family name of
 * any font installed on this machine. The typed name is saved after a short
 * pause (configStore.set writes the cookie and may POST /api/config), flushed
 * on unmount, and dropped when a built-in is picked mid-pause.
 */
const FontFamilyField: React.FC<{
  label: string;
  description: string;
  value: string;
  onSave: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** The `font-family` the controls preview a value in. */
  previewStack: (value: string) => string;
  previewText: string;
  customAriaLabel: string;
  customPlaceholder: string;
  notFoundText: string;
  /** Load a built-in's web font for the preview, if it has one. */
  loadFont?: (value: string) => void;
  previewClassName?: string;
}> = ({ label, description, value, onSave, options, previewStack, previewText, customAriaLabel, customPlaceholder, notFoundText, loadFont, previewClassName = '' }) => {
  const isBuiltIn = (v: string) => options.some((opt) => opt.value === v);
  // Custom font: progressive disclosure. customFontMode keeps the input open
  // while the user picks "Custom…" or has a non-built-in font saved.
  const [customFontMode, setCustomFontMode] = useState(() => !!value && !isBuiltIn(value));
  const [customFontDraft, setCustomFontDraft] = useState(() => (value && !isBuiltIn(value) ? value : ''));
  const customFontSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Pending debounced value. Non-null means "typed but not yet saved" — it is
  // flushed (not discarded) on unmount, and cancelled when a built-in is
  // picked so a stale timer can't overwrite the new selection.
  const pendingFontSave = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const customActive = customFontMode || (!!value && !isBuiltIn(value));
  // Width-measurement check — deterministic per machine, no permissions.
  const customFontInstalled = useMemo(
    () => (normalizeFontFamilyName(customFontDraft) ? isFontInstalled(customFontDraft) : null),
    [customFontDraft],
  );

  // Load font for the preview swatch
  useEffect(() => {
    if (value) loadFont?.(value);
  }, [value, loadFont]);

  // Adopt external changes (late server hydration, edits from elsewhere) into
  // the draft — but never clobber typing that hasn't been saved yet.
  useEffect(() => {
    if (pendingFontSave.current !== null) return;
    if (value && !isBuiltIn(value) && value !== normalizeFontFamilyName(customFontDraft)) {
      setCustomFontDraft(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const cancelPendingFontSave = () => {
    clearTimeout(customFontSaveTimer.current);
    pendingFontSave.current = null;
  };

  // Flush a pending save on unmount so closing the panel mid-debounce
  // doesn't lose the typed font.
  useEffect(() => () => {
    clearTimeout(customFontSaveTimer.current);
    if (pendingFontSave.current !== null) {
      onSaveRef.current(pendingFontSave.current);
    }
  }, []);

  const handleCustomFontInput = (next: string) => {
    setCustomFontDraft(next);
    // Debounce the save — per-keystroke writes would spam the cookie and
    // /api/config.
    clearTimeout(customFontSaveTimer.current);
    pendingFontSave.current = normalizeFontFamilyName(next);
    customFontSaveTimer.current = setTimeout(() => {
      if (pendingFontSave.current !== null) {
        onSaveRef.current(pendingFontSave.current);
        pendingFontSave.current = null;
      }
    }, 400);
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <select
        value={customActive ? CUSTOM_FONT_SENTINEL : value}
        aria-label={label}
        onChange={(e) => {
          if (e.target.value === CUSTOM_FONT_SENTINEL) {
            setCustomFontMode(true);
          } else {
            // Cancel any in-flight debounced custom save so a stale timer
            // can't overwrite this selection.
            cancelPendingFontSave();
            setCustomFontMode(false);
            setCustomFontDraft('');
            onSave(e.target.value);
          }
        }}
        className="w-full px-3 py-1.5 text-sm rounded-md bg-muted/50 border border-border text-foreground"
        style={value && !customActive ? stackStyle(previewStack(value)) : undefined}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        <option value={CUSTOM_FONT_SENTINEL}>自定义…</option>
      </select>
      {customActive && (
        <div className="space-y-1">
          <input
            type="text"
            value={customFontDraft}
            onChange={(e) => handleCustomFontInput(e.target.value)}
            placeholder={customPlaceholder}
            aria-label={customAriaLabel}
            maxLength={MAX_FONT_FAMILY_LENGTH}
            autoFocus={!customFontDraft}
            spellCheck={false}
            className="w-full px-3 py-1.5 text-sm rounded-md bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            style={stackStyle(previewStack(customFontDraft))}
          />
          <div className="text-[11px]" aria-live="polite">
            {!normalizeFontFamilyName(customFontDraft) ? (
              <span className="text-muted-foreground">本机安装的任意字体均可使用，请输入其字体族名称。</span>
            ) : customFontInstalled === true ? (
              <span className="text-success">✓ 已在本机找到</span>
            ) : customFontInstalled === false ? (
              <span className="text-warning">{notFoundText}</span>
            ) : null}
          </div>
        </div>
      )}
      {value && (
        <div
          className={`text-xs text-muted-foreground px-1 py-1 rounded bg-muted/30 ${previewClassName}`}
          style={stackStyle(previewStack(value))}
        >
          {previewText}
        </div>
      )}
    </div>
  );
};

/**
 * Experimental (the owner, 2026-10-27: "its own page on settings", the last
 * tab): each experimental setting, off by default. Today one, code review's
 * Edit Code to Suggest (`editSuggestions`, the
 * `plannotator-experimental-edit-suggestions` cookie, unchanged).
 */
const ExperimentalTab: React.FC = () => {
  const editSuggestions = useConfigValue('editSuggestions');
  return (
    <div className="space-y-3" data-settings-experimental="">
      <div className="text-xs text-muted-foreground">
        仍在试验中的功能。每项功能默认关闭，需你手动开启。
      </div>
      <ToggleSwitch
        checked={editSuggestions}
        onChange={(v) => configStore.set('editSuggestions', v)}
        label="编辑代码以提交建议"
        description="在全文件视图中就地编辑文件；你的净变更会变成一条建议评论。浏览器绝不会写入文件。使用实验性的上游编辑器。"
      />
    </div>
  );
};

const ReviewDisplayTab: React.FC<{ isCompactTouchLayout?: boolean }> = ({ isCompactTouchLayout = false }) => {
  const diffFontFamily = useConfigValue('diffFontFamily');
  const diffFontSize = useConfigValue('diffFontSize');
  const tokenHoverTrigger = useConfigValue('tokenHoverTrigger');
  const tokenHoverDelay = useConfigValue('tokenHoverDelay');

  return (
    <>
      {/* Hover cards (internally tokenHover*; the label is what changed, not
          the ids). One trigger select rather than a toggle plus a mode: `Off`
          is a value of the same question, so there is no unreachable
          enabled-but-off state to reason about. The delay stays a separate
          axis because "too eager" is a complaint neither the hold-modifier option
          nor Off answers. */}
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium">悬停卡片</div>
          <div className="text-xs text-muted-foreground">
            将指针停在差异中的某个符号上，即可查看其定义位置和引用者。需要 ripgrep 和本地检出；搜索无结果时不会显示任何内容。无论是否启用，{modKeyWord}+点击仍会打开「引用」面板。
          </div>
        </div>
        <SegmentedControl
          options={TOKEN_HOVER_TRIGGER_OPTIONS}
          value={tokenHoverTrigger}
          onChange={(v) => configStore.set('tokenHoverTrigger', v)}
        />
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            指针停留多久后才请求卡片
          </div>
          <SegmentedControl
            options={TOKEN_HOVER_DELAY_OPTIONS}
            value={String(tokenHoverDelay) as TokenHoverDelayOption}
            onChange={(v) => configStore.set('tokenHoverDelay', Number(v) as TokenHoverDelay)}
            disabled={tokenHoverTrigger === 'off'}
          />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Font Family */}
      <FontFamilyField
        label="代码字体"
        description="差异代码行使用的字体族"
        value={diffFontFamily}
        onSave={(v) => configStore.set('diffFontFamily', v)}
        options={DIFF_FONT_OPTIONS}
        previewStack={monoFontStack}
        previewText="预览：const x = fn(42);"
        customAriaLabel="自定义代码字体名称"
        customPlaceholder="已安装的字体名称，例如 Iosevka"
        notFoundText="未找到——差异将回退为等宽字体"
        loadFont={loadDiffFont}
        previewClassName="font-mono"
      />

      <div className="border-t border-border" />

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">代码字体大小</div>
            <div className="text-xs text-muted-foreground">差异代码行的字体大小</div>
          </div>
          <div className="text-xs tabular-nums text-muted-foreground min-w-[4ch] text-right">
            {normalizeCssFontSize(diffFontSize) || '自动'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={8}
            max={24}
            step={1}
            value={diffFontSize ? parseInt(diffFontSize) : 13}
            onChange={(e) => configStore.set('diffFontSize', `${e.target.value}px`)}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          {diffFontSize && (
            <button
              onClick={() => configStore.set('diffFontSize', '')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              重置
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border" />

      {isCompactTouchLayout ? (
        <div className="space-y-2" data-settings-diff-display="">
          <div>
            <div className="text-sm font-medium">差异显示</div>
            <div className="text-xs text-muted-foreground">
              此布局在本次会话中显示统一差异；你的桌面端偏好保持不变。
            </div>
          </div>
          <DiffDisplayOptionsBody />
        </div>
      ) : (
        <div className="space-y-1" data-settings-diff-display="">
          <div className="text-sm font-medium">差异显示</div>
          <div className="text-xs text-muted-foreground">
            「并排」或「统一」是差异上方齿轮旁的按钮。齿轮中包含其余选项：自动换行、行号、背景、变更标记、变更词语、制表符宽度、完整文件以及隐藏空白。
          </div>
        </div>
      )}

    </>
  );
};

/**
 * Stored label config — serialized to JSON in the config store.
 * `blocking` controls whether the blocking/non-blocking toggle
 * appears in the picker when this label is selected.
 */
interface CCLabelConfig {
  label: string;
  display: string;
  blocking: boolean; // true = show toggle in picker, false = no decoration
}

const DEFAULT_CC_LABELS: CCLabelConfig[] = [
  { label: 'suggestion', display: 'suggestion', blocking: true },
  { label: 'nitpick',    display: 'nit',        blocking: false },
  { label: 'question',   display: 'question',   blocking: true },
  { label: 'issue',      display: 'issue',      blocking: true },
  { label: 'praise',     display: 'praise',     blocking: false },
  { label: 'thought',    display: 'thought',    blocking: false },
  { label: 'note',       display: 'note',       blocking: false },
  { label: 'todo',       display: 'todo',       blocking: true },
  { label: 'chore',      display: 'chore',      blocking: true },
];

function parseCCLabels(json: string | null): CCLabelConfig[] {
  if (!json) return DEFAULT_CC_LABELS;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return DEFAULT_CC_LABELS;
    return parsed.map((l: Record<string, unknown>) => ({
      label: (l.label as string) || 'custom',
      display: (l.display as string) || (l.label as string) || 'custom',
      blocking: l.blocking === true || l.blocking === 'true',
    }));
  } catch {
    return DEFAULT_CC_LABELS;
  }
}

const CommentsTab: React.FC = () => {
  const conventionalComments = useConfigValue('conventionalComments');
  const labelsJson = useConfigValue('conventionalLabels');
  const [labels, setLabels] = useState(() => parseCCLabels(labelsJson));

  const isDefault = labelsJson === null;

  const save = (next: CCLabelConfig[]) => {
    setLabels(next);
    configStore.set('conventionalLabels', JSON.stringify(next));
  };

  const updateLabel = (index: number, updates: Partial<CCLabelConfig>) => {
    const next = [...labels];
    next[index] = { ...next[index], ...updates };
    save(next);
  };

  const removeLabel = (index: number) => {
    save(labels.filter((_, i) => i !== index));
  };

  const addLabel = () => {
    const existing = new Set(labels.map(l => l.label));
    let slug = 'custom';
    let n = 2;
    while (existing.has(slug)) { slug = `custom-${n++}`; }
    save([...labels, { label: slug, display: slug, blocking: false }]);
  };

  const resetToDefaults = () => {
    setLabels(DEFAULT_CC_LABELS);
    configStore.set('conventionalLabels', null);
  };

  return (
    <>
      <ToggleSwitch
        checked={conventionalComments}
        onChange={(v) => configStore.set('conventionalComments', v)}
        label="约定式评论"
        description="为审查评论添加结构化标签"
      />

      <div className={`space-y-4 transition-opacity ${conventionalComments ? '' : 'opacity-40 pointer-events-none'}`}>

      <div className="border-t border-border" />

      {/* How it works */}
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium">工作原理</div>
          <div className="text-xs text-muted-foreground leading-relaxed mt-1">
            启用后，在为代码添加批注时，评论输入框上方会出现标签选择器。标签可标明你的反馈意图，清楚区分一条评论是阻塞性问题、微不足道的挑剔，还是赞扬。
          </div>
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed">
          基于{' '}
          <a
            href="https://conventionalcomments.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Conventional Comments
          </a>
          {' '}规范。评论以纯文本导出，在 GitHub 上可读，也能被工具解析。
        </div>

        {/* Example output */}
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">示例输出</div>
          <div className="font-mono text-[11px] text-foreground/80 leading-relaxed">
            <span className="font-bold">issue</span> <span className="text-muted-foreground">(blocking)</span>: 如果 user 为 null 就会抛错——重构时移除了这层校验。
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Label editor */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">标签</div>
          <div className="text-xs text-muted-foreground">
            自定义标签及其默认严重程度
          </div>
        </div>
        {!isDefault && (
          <button
            onClick={resetToDefaults}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            恢复默认
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-end gap-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        <span className="flex-1">标签</span>
        <span className="w-20 text-center">阻塞标记</span>
        <span className="w-6" />
      </div>

      <div className="space-y-1.5">
        {labels.map((label, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/40"
          >
            <input
              type="text"
              value={label.display}
              onChange={(e) => {
                const display = e.target.value;
                updateLabel(index, { display, label: display });
              }}
              className="flex-1 px-2 py-1 bg-background/80 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-0"
            />
            <div className="w-20 flex justify-center">
              <button
                role="switch"
                aria-checked={label.blocking}
                onClick={() => updateLabel(index, { blocking: !label.blocking })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  label.blocking ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    label.blocking ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <button
              onClick={() => removeLabel(index)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              title="删除标签"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {labels.length < 12 && (
        <button
          onClick={addLabel}
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-foreground/30 transition-colors"
        >
          + 添加标签
        </button>
      )}

      </div>
    </>
  );
};

export const Settings: React.FC<SettingsProps> = ({ taterMode, onTaterModeChange, onIdentityChange, origin, mode = 'plan', annotateParity = false, onUIPreferencesChange, onPermissionModeChange, externalOpen, externalTab, onExternalClose, aiProviders = [], gitUser, autoUpdateSetting, updateCheckSetting, cookieHostSetting, packageChangesSetting, agentToolSetting, onAgentToolChange, sinceBaseUnavailable, isCompactTouchLayout = false, onDetectObsidianVaults, agentTerminalAvailable = false, webmcpAvailable = false, hideEnterSavesComment = false, hideRepoOwnerSetting = false, showDocumentTextSize = false, showDocumentFont = false }) => {
  const webmcpTools = useWebMcpToolsEnabled();
  const autoUpdate = useConfigValue('autoUpdate');
  const updateChecksOn = updateCheckSetting ? updateCheckSetting.on : true;
  const [showDialog, setShowDialog] = useState(false);
  const settingsWasOpenRef = useRef(false);
  const [themePreview, setThemePreview] = useState(false);

  useEffect(() => {
    const wasOpen = settingsWasOpenRef.current;
    settingsWasOpenRef.current = showDialog;
    if (
      wasOpen
      && !showDialog
      && !themePreview
      && mode !== 'review'
      && configStore.get('vimModeEnabled')
    ) {
      requestVimDocumentFocus();
    }
  }, [mode, showDialog, themePreview]);

  useEffect(() => {
    if (!themePreview) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setThemePreview(false); setShowDialog(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [themePreview]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const gridEnabled = useConfigValue('gridEnabled');
  const diagramShadow = useConfigValue('diagramShadow');
  const documentTextSize = useConfigValue('documentTextSize');
  const documentFontFamily = useConfigValue('documentFontFamily');
  const documentSourceLineNumbers = useConfigValue('documentSourceLineNumbers');
  const vimModeEnabled = useConfigValue('vimModeEnabled');
  const enterSavesComment = useConfigValue('enterSavesComment');
  const hideRepoOwner = useConfigValue('hideRepoOwner');
  const vimHudEnabled = useConfigValue('vimHudEnabled');
  const vimHudKeyPanelEnabled = useConfigValue('vimHudKeyPanelEnabled');
  const agentTerminalSide = useConfigValue('agentTerminalSide');
  const [identity, setIdentity] = useState('');
  const [obsidian, setObsidian] = useState<ObsidianSettings>({
    enabled: false,
    vaultPath: '',
    folder: 'plannotator',
    filenameSeparator: 'space',
    autoSave: false,
    vaultBrowserEnabled: false,
  });
  const [detectedVaults, setDetectedVaults] = useState<string[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [bear, setBear] = useState<BearSettings>({ enabled: false, customTags: '', tagPosition: 'append', autoSave: false });
  const [octarine, setOctarine] = useState<OctarineSettings>({ enabled: false, workspace: '', folder: 'plannotator', autoSave: false });
  const [notion, setNotion] = useState<NotionSettings>({ enabled: false, parentPageId: '', autoSave: false });
  // The agent switch default depends on the surface: plan approval hands off to
  // the build agent, review feedback stays on the current agent.
  const agentSurface: AgentSwitchSurface = mode === 'review' ? 'review' : 'plan';
  // Annotate with parity on gets the same document tabs as plan review.
  const annotateDocumentTabs = mode === 'annotate' && annotateParity;
  const [agent, setAgent] = useState<AgentSwitchSettings>(() => getAgentSwitchDefaults(agentSurface));
  const [planSave, setPlanSave] = useState<PlanSaveSettings>({ enabled: true, customPath: null });
  const [uiPrefs, setUiPrefs] = useState<UIPreferences>({ tocEnabled: true, stickyActionsEnabled: true, planWidth: 'compact' });
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('bypassPermissions');
  const [agentWarning, setAgentWarning] = useState<string | null>(null);
  const [autoCloseDelay, setAutoCloseDelayState] = useState<AutoCloseDelay>('off');
  const [defaultNotesApp, setDefaultNotesApp] = useState<DefaultNotesApp>('ask');
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [fileBrowserSettings, setFileBrowserSettings] = useState<FileBrowserSettings>({ enabled: false, directories: [] });
  const [newDirPath, setNewDirPath] = useState('');

  // Fetch available agents for OpenCode
  const { agents: availableAgents, validateAgent, getAgentWarning } = useAgents(origin ?? null, agentSurface);

  const mainTabs = useMemo(() => {
    const t: { id: SettingsTab; label: string }[] = [{ id: 'general', label: '通用' }];
    t.push({ id: 'theme', label: '主题' });
    // Annotate renders the same document viewer as plan review, so the
    // document-level tabs apply there too. Only rows that describe a plan
    // decision (plan snapshots, plan-arrival auto-save, plan-time hooks,
    // post-approval permission mode / agent switch) stay plan-only.
    if (mode === 'plan' || annotateDocumentTabs) {
      t.push({ id: 'display', label: '显示' });
      t.push({ id: 'saving', label: '保存' });
      t.push({ id: 'labels', label: '标签' });
    }
    if (mode === 'review') {
      t.push({ id: 'review', label: '审查' });
      t.push({ id: 'display', label: '编辑器' });
      t.push({ id: 'semantic', label: '语义差异' });
      t.push({ id: 'analysis', label: '分析' });
      t.push({ id: 'comments', label: '评论' });
      if (aiProviders.length > 0) {
        t.push({ id: 'ai', label: 'AI' });
      }
    }
    if (mode !== 'review') {
      t.push({ id: 'vim', label: 'Vim' });
    }
    t.push({ id: 'shortcuts', label: '快捷键' });
    if (mode === 'plan') {
      t.push({ id: 'hooks', label: '钩子' });
    }
    return t;
  }, [mode, annotateDocumentTabs, aiProviders.length]);

  const integrationTabs: { id: SettingsTab; label: string }[] = [
    { id: 'files', label: '文件' },
    ...(mode === 'plan' || annotateDocumentTabs
      ? [{ id: 'obsidian' as SettingsTab, label: 'Obsidian' }, { id: 'bear' as SettingsTab, label: 'Bear' }, { id: 'octarine' as SettingsTab, label: 'Octarine' }, ...(isNotionAvailable() ? [{ id: 'notion' as SettingsTab, label: 'Notion' }] : [])]
      : []),
  ];
  // Experimental is the last tab, on its own below the integrations (the owner,
  // 2026-10-27). Only where it has a setting: code review's Edit Code to Suggest.
  const experimentalTabs: { id: SettingsTab; label: string }[] = mode === 'review' ? [{ id: 'experimental', label: '实验性' }] : [];
  const obsidianDefaultSaveAvailable = obsidian.enabled && getEffectiveVaultPath(obsidian).trim().length > 0;
  const bearDefaultSaveAvailable = bear.enabled;
  const octarineDefaultSaveAvailable = octarine.enabled && octarine.workspace.trim().length > 0;
  const notionDefaultSaveAvailable = getNotionParentPageId(notion) !== null;

  // Sync external open state
  useEffect(() => {
    if (externalOpen) {
      if (externalTab) setActiveTab(externalTab);
      setShowDialog(true);
      onExternalClose?.();
    }
  }, [externalOpen, externalTab, onExternalClose]);

  useEffect(() => {
    if (showDialog) {
      setIdentity(getIdentity())
      setObsidian(getObsidianSettings());
      setBear(getBearSettings());
      setOctarine(getOctarineSettings());
      setNotion(getNotionSettings());
      setAgent(getAgentSwitchSettings(agentSurface));
      setPlanSave(getPlanSaveSettings());
      setUiPrefs(getUIPreferences());
      setPermissionMode(getPermissionModeSettings().mode);
      setAutoCloseDelayState(getAutoCloseDelay());
      setDefaultNotesApp(getDefaultNotesApp());
      const aiSettings = getAIProviderSettings();
      setAiProvider(resolveAIProviderSelection({ providers: aiProviders, origin, settings: aiSettings }).providerId);
      setFileBrowserSettings(getFileBrowserSettings());

      // Validate agent setting when dialog opens
      if (origin === 'opencode') {
        setAgentWarning(getAgentWarning());
      }
    }
  }, [showDialog, availableAgents, origin, getAgentWarning, aiProviders.length]);

  useEffect(() => {
    if (!showDialog) return;

    const defaultSaveAvailable =
      defaultNotesApp === 'ask' ||
      defaultNotesApp === 'download' ||
      (defaultNotesApp === 'obsidian' && obsidianDefaultSaveAvailable) ||
      (defaultNotesApp === 'bear' && bearDefaultSaveAvailable) ||
      (defaultNotesApp === 'octarine' && octarineDefaultSaveAvailable) ||
      // A session without Notion (remote, or no NOTION_TOKEN) keeps the choice for the next one.
      (defaultNotesApp === 'notion' && (notionDefaultSaveAvailable || !isNotionAvailable()));

    if (!defaultSaveAvailable) {
      setDefaultNotesApp('ask');
      saveDefaultNotesApp('ask');
    }
  }, [
    showDialog,
    defaultNotesApp,
    obsidianDefaultSaveAvailable,
    bearDefaultSaveAvailable,
    octarineDefaultSaveAvailable,
    notionDefaultSaveAvailable,
  ]);

  // Fetch detected vaults when Obsidian is enabled
  useEffect(() => {
    if (obsidian.enabled && detectedVaults.length === 0 && !vaultsLoading) {
      setVaultsLoading(true);
      const detect = onDetectObsidianVaults
        ?? (() => fetch('/api/obsidian/vaults').then(res => res.json()).then((data: { vaults: string[] }) => data.vaults || []));
      detect()
        .then((vaults: string[]) => {
          setDetectedVaults(vaults || []);
          // Auto-select first vault if none set
          if (vaults?.length > 0 && !obsidian.vaultPath) {
            handleObsidianChange({ vaultPath: vaults[0] });
          }
        })
        .catch(() => setDetectedVaults([]))
        .finally(() => setVaultsLoading(false));
    }
  }, [obsidian.enabled]);

  const handleFileBrowserChange = (updates: Partial<FileBrowserSettings>) => {
    const newSettings = { ...fileBrowserSettings, ...updates };
    setFileBrowserSettings(newSettings);
    saveFileBrowserSettings(newSettings);
    if (onUIPreferencesChange) onUIPreferencesChange({ ...uiPrefs });
  };

  const addDirectory = () => {
    const trimmed = newDirPath.trim();
    if (trimmed && !fileBrowserSettings.directories.includes(trimmed)) {
      handleFileBrowserChange({
        directories: [...fileBrowserSettings.directories, trimmed],
      });
    }
    setNewDirPath('');
  };

  const handleObsidianChange = (updates: Partial<ObsidianSettings>) => {
    const newSettings = { ...obsidian, ...updates };
    setObsidian(newSettings);
    saveObsidianSettings(newSettings);
  };

  const handleBearChange = (updates: Partial<BearSettings>) => {
    const newSettings = { ...bear, ...updates };
    setBear(newSettings);
    saveBearSettings(newSettings);
  };

  const handleOctarineChange = (updates: Partial<OctarineSettings>) => {
    const newSettings = { ...octarine, ...updates };
    setOctarine(newSettings);
    saveOctarineSettings(newSettings);
  };

  const handleNotionChange = (updates: Partial<NotionSettings>) => {
    const newSettings = { ...notion, ...updates };
    setNotion(newSettings);
    saveNotionSettings(newSettings);
  };

  const handleAgentChange = (switchTo: AgentSwitchSettings['switchTo'], customName?: string) => {
    const newSettings = { switchTo, customName: customName ?? agent.customName };
    setAgent(newSettings);
    saveAgentSwitchSettings(newSettings);
  };

  const handlePlanSaveChange = (updates: Partial<PlanSaveSettings>) => {
    const newSettings = { ...planSave, ...updates };
    setPlanSave(newSettings);
    savePlanSaveSettings(newSettings);
  };

  const handleUIPrefsChange = (updates: Partial<UIPreferences>) => {
    const newPrefs = { ...uiPrefs, ...updates };
    setUiPrefs(newPrefs);
    saveUIPreferences(newPrefs);
    onUIPreferencesChange?.(newPrefs);
  };

  const handlePermissionModeChange = (mode: PermissionMode) => {
    setPermissionMode(mode);
    savePermissionModeSettings(mode);
    onPermissionModeChange?.(mode);
  };

  const handleDefaultNotesAppChange = (app: DefaultNotesApp) => {
    setDefaultNotesApp(app);
    saveDefaultNotesApp(app);
  };

  // Server write-back is handled automatically by configStore.set() (debounced POST /api/config)

  const handleRegenerateIdentity = () => {
    const oldIdentity = identity;
    const newIdentity = regenerateIdentity();
    setIdentity(newIdentity);
    onIdentityChange?.(oldIdentity, newIdentity);
  };

  const handleIdentitySave = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === identity) return;
    const oldIdentity = identity;
    const saved = setCustomIdentity(trimmed);
    setIdentity(saved);
    onIdentityChange?.(oldIdentity, saved);
  };

  const handleUseGitName = () => {
    if (!gitUser) return;
    handleIdentitySave(gitUser);
  };

  // When a host owns identity (e.g. a logged-in user whose author is server-stamped),
  // hide the rename/regenerate controls so a local name can't diverge from it.
  // Default (Plannotator cookie identity) is editable, so this is true and the
  // controls render exactly as before.
  const identityEditable = isIdentityEditable();

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="设置"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {showDialog && !themePreview && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowDialog(false)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plannotator-settings-title"
            onClick={e => e.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || event.defaultPrevented) return;
              event.preventDefault();
              event.stopPropagation();
              setShowDialog(false);
            }}
          >
            {taterMode && <TaterSpritePullup />}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 id="plannotator-settings-title" className="font-semibold text-sm">设置</h3>
              <button
                type="button"
                aria-label="关闭设置"
                onClick={() => setShowDialog(false)}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:min-h-[420px] flex-1 min-h-0 overflow-hidden">
              {/* Mobile: horizontal tab bar */}
              <nav className="md:hidden flex overflow-x-auto border-b border-border px-2 py-1.5 gap-1 flex-shrink-0">
                {[...mainTabs, ...integrationTabs, ...experimentalTabs].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Desktop: sidebar */}
              <nav className="hidden md:block w-40 border-r border-border p-2 flex-shrink-0">
                <div className="space-y-0.5">
                  {mainTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-between ${
                        activeTab === tab.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {integrationTabs.length > 0 && (
                  <>
                    <div className="mx-2 my-2 border-t border-border/50" />
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      集成
                    </div>
                    <div className="space-y-0.5">
                      {integrationTabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {experimentalTabs.length > 0 && (
                  <>
                    <div className="mx-2 my-2 border-t border-border/50" />
                    <div className="space-y-0.5">
                      {experimentalTabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </nav>

              {/* Content — scrollable */}
              <OverlayScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">

                {/* === GENERAL TAB === */}
                {activeTab === 'general' && (
                  <>
                    {/* Identity */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">你的身份</div>
                      <div className="text-xs text-muted-foreground">
                        与他人分享批注时使用
                      </div>
                      <div className="flex items-center gap-2">
                        {identityEditable ? (
                          <input
                            key={identity}
                            type="text"
                            defaultValue={identity}
                            onBlur={(e) => handleIdentitySave(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleIdentitySave((e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono truncate border border-transparent focus:border-primary/50 focus:outline-none transition-colors"
                            placeholder="输入你的名字…"
                          />
                        ) : (
                          <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono truncate border border-transparent">
                            {identity}
                          </div>
                        )}
                        {identityEditable && gitUser && (
                          <button
                            onClick={handleUseGitName}
                            onMouseDown={(e) => e.preventDefault()}
                            className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            title={`使用 git 身份：${gitUser}`}
                          >
                            <GitUser className="w-5 h-5" />
                          </button>
                        )}
                        {identityEditable && (
                          <button
                            onClick={handleRegenerateIdentity}
                            onMouseDown={(e) => e.preventDefault()}
                            className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            title="重新生成随机身份"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Enter saves a comment (#1934): opt-in, cookie-only.
                        Governs every comment composer; never the decision keys. */}
                    {!hideEnterSavesComment && (
                      <>
                        <div className="border-t border-border" />
                        <div data-enter-saves-comment-setting="true">
                          <ToggleSwitch
                            checked={enterSavesComment}
                            onChange={(v) => configStore.set('enterSavesComment', v)}
                            label="按 Enter 保存评论"
                            description={`Shift+Enter 换行。${modKeyWord}+Enter 仍可保存。`}
                          />
                        </div>
                      </>
                    )}

                    {/* Hide the repository owner: opt-in, cookie-only. On names
                        the repository alone (utils/repoLabel). */}
                    {!hideRepoOwnerSetting && (
                      <>
                        <div className="border-t border-border" />
                        <div data-repo-owner-setting="true">
                          <ToggleSwitch
                            checked={hideRepoOwner}
                            onChange={(v) => configStore.set('hideRepoOwner', v)}
                            label="隐藏仓库所有者"
                            description="开启后，文档、代码审查和标签页标题只显示仓库名，不显示所有者。将鼠标悬停在名称上可查看所有者。"
                          />
                        </div>
                      </>
                    )}

                    {/* Update notices: on by default. Writes updateCheck to
                        ~/.plannotator/config.json; off makes no request to GitHub. */}
                    {updateCheckSetting && (
                      <>
                        <div className="border-t border-border" />
                        <ToggleSwitch
                          checked={updateChecksOn}
                          onChange={(v) => updateCheckSetting.onChange(v)}
                          disabled={updateCheckSetting.env !== undefined}
                          label="有新版本时通知我"
                          description={
                            updateCheckSetting.env !== undefined
                              ? '由环境变量 PLANNOTATOR_UPDATE_CHECK 设定。'
                              : '本机会每隔几分钟向 GitHub 查询一次，绝不经过你的浏览器。关闭后完全不会发起请求。'
                          }
                        />
                      </>
                    )}

                    {/* Auto-update (#1634): opt-in, default off. Writes
                        autoUpdate to ~/.plannotator/config.json. It needs
                        update checks, so it is locked while they are off. */}
                    {autoUpdateSetting && (
                      <>
                        <div className="border-t border-border" />
                        <ToggleSwitch
                          checked={(autoUpdateSetting.env ?? autoUpdate) && updateChecksOn}
                          onChange={(v) => configStore.set('autoUpdate', v)}
                          disabled={autoUpdateSetting.env !== undefined || !updateChecksOn}
                          label="让 Plannotator 保持最新"
                          description={
                            autoUpdateSetting.env !== undefined
                              ? '由环境变量 PLANNOTATOR_AUTO_UPDATE 设定。'
                              : !updateChecksOn
                                ? '需要先启用上方的更新检查。'
                                : '在后台安装新版本，每天最多一次，且绝不会在有其他审查打开时进行。'
                          }
                        />
                      </>
                    )}

                    {/* Open Plannotator at plannotator.localhost (#2184): writes or
                        removes urlHost "plannotator.localhost" in config.json.
                        Locked while PLANNOTATOR_URL_HOST is set or config.json
                        holds another urlHost, which it never replaces. */}
                    {cookieHostSetting && (
                      <>
                        <div className="border-t border-border" />
                        <div data-cookie-host-setting={cookieHostSettingState(cookieHostSetting)}>
                          <ToggleSwitch
                            checked={cookieHostSetting.on}
                            onChange={(v) => cookieHostSetting.onChange(v)}
                            disabled={cookieHostSetting.env !== undefined || cookieHostSetting.urlHost !== undefined}
                            label="在 plannotator.localhost 打开 Plannotator"
                            description={cookieHostDescription(cookieHostSetting)}
                          />
                          {cookieHostSetting.error && (
                            <div role="alert" className="mt-1 text-xs text-destructive">{cookieHostSetting.error}</div>
                          )}
                        </div>
                      </>
                    )}

                    {/* The `plannotator` agent tool switch: only where the
                        server reports a tool host (Claude Code mod, Pi,
                        OpenCode 2). Writes agentTool to config.json; applies
                        to the next session. */}
                    {agentToolSetting && onAgentToolChange && (
                      <>
                        <div className="border-t border-border" />
                        <AgentToolSettingRow setting={agentToolSetting} onChange={onAgentToolChange} />
                      </>
                    )}

                    {/* Agent tools (WebMCP). Shown only when the browser
                        exposes document.modelContext; off unregisters the
                        tools for this browser. Cookie-only and idle at its
                        default: no cookie exists until the user opts out. */}
                    {webmcpAvailable && (
                      <>
                        <div className="border-t border-border" />
                        <div className="flex items-center justify-between" data-webmcp-setting="true">
                          <div>
                            <div className="text-sm font-medium">智能体工具</div>
                            <div className="text-xs text-muted-foreground">
                              允许你的浏览器智能体读取此文档并留下评论。批准和发送反馈仍然由你完成。
                            </div>
                          </div>
                          <button
                            role="switch"
                            aria-checked={webmcpTools}
                            aria-label="智能体工具"
                            onClick={() => setWebMcpToolsEnabled(!webmcpTools)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              webmcpTools ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                webmcpTools ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Permission Mode (Claude Code only) */}
                    {origin === 'claude-code' && mode === 'plan' && (
                      <>
                        <div className="border-t border-border" />
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium">权限模式</div>
                            <div className="text-xs text-muted-foreground">
                              计划批准后的自动化级别
                            </div>
                          </div>
                          <select
                            value={permissionMode}
                            onChange={(e) => handlePermissionModeChange(e.target.value as PermissionMode)}
                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                          >
                            {PERMISSION_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-muted-foreground/70">
                            {PERMISSION_MODE_OPTIONS.find(o => o.value === permissionMode)?.description}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Agent Switching (OpenCode only). Applied on plan
                        approval only; annotate decisions never switch agents. */}
                    {origin === 'opencode' && !annotateDocumentTabs && (
                      <>
                        <div className="border-t border-border" />
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium">智能体切换</div>
                            <div className="text-xs text-muted-foreground">
                              计划批准后切换到哪个智能体
                            </div>
                          </div>

                          {agentWarning && (
                            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400">
                              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>{agentWarning}</span>
                            </div>
                          )}

                          <select
                            value={agent.switchTo}
                            onChange={(e) => {
                              handleAgentChange(e.target.value);
                              setAgentWarning(null);
                            }}
                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                          >
                            {availableAgents.length > 0 ? (
                              <>
                                {agent.switchTo !== 'custom' &&
                                 agent.switchTo !== 'disabled' &&
                                 !availableAgents.some(a => a.id.toLowerCase() === agent.switchTo.toLowerCase()) && (
                                  <option value={agent.switchTo} disabled>
                                    {agent.switchTo}（未找到）
                                  </option>
                                )}
                                {availableAgents.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                                <option value="custom">自定义</option>
                                <option value="disabled">禁用</option>
                              </>
                            ) : (
                              AGENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))
                            )}
                          </select>
                          {agent.switchTo === 'custom' && (
                            <input
                              type="text"
                              value={agent.customName || ''}
                              onChange={(e) => {
                                const customName = e.target.value;
                                handleAgentChange('custom', customName);
                                if (customName && availableAgents.length > 0) {
                                  if (!validateAgent(customName)) {
                                    setAgentWarning(`在 OpenCode 中未找到智能体「${customName}」。这可能导致错误。`);
                                  } else {
                                    setAgentWarning(null);
                                  }
                                } else {
                                  setAgentWarning(null);
                                }
                              }}
                              placeholder="输入智能体名称…"
                              className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                            />
                          )}
                          <div className="text-[10px] text-muted-foreground/70">
                            {agent.switchTo === 'custom' && agent.customName
                              ? `批准后切换到智能体「${agent.customName}」`
                              : agent.switchTo === 'disabled'
                                ? '批准后保持当前智能体'
                                : `批准后切换到智能体 ${agent.switchTo}`}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Agent TUI position. The same control lives in the
                        terminal's own Display popover, but that one is
                        unreachable once the position is Hidden — this is the
                        way back. Both write the same config value. Gated on the
                        terminal actually being available in this session, so a
                        remote or runtime-less annotate never offers a dead
                        control. */}
                    {mode === 'annotate' && agentTerminalAvailable && (
                      <>
                        <div className="border-t border-border" />
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium">智能体 TUI 位置</div>
                            <div className="text-xs text-muted-foreground">
                              智能体终端停靠在哪一侧；选择「隐藏」可将其移出布局
                            </div>
                          </div>
                          <SegmentedControl
                            options={AGENT_TERMINAL_SIDE_OPTIONS}
                            value={agentTerminalSide}
                            onChange={(v) => configStore.set('agentTerminalSide', v)}
                          />
                          {agentTerminalSide === 'hidden' && (
                            <div className="text-[10px] text-muted-foreground/70">
                              你仍可从侧边栏工具条为本次会话打开它。
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="border-t border-border" />

                    {/* Auto-close Tab */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">自动关闭标签页</div>
                      <select
                        value={autoCloseDelay}
                        onChange={(e) => {
                          const next = e.target.value as AutoCloseDelay;
                          setAutoCloseDelayState(next);
                          setAutoCloseDelay(next);
                        }}
                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        {AUTO_CLOSE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-muted-foreground/70">
                        {AUTO_CLOSE_OPTIONS.find(o => o.value === autoCloseDelay)?.description}
                      </div>
                    </div>
                  </>
                )}

                {/* === THEME TAB === */}
                {activeTab === 'theme' && <ThemeTab onPreview={() => { setShowDialog(false); setThemePreview(true); }} />}

                {/* === REVIEW TAB === */}
                {activeTab === 'review' && mode === 'review' && (
                  <ReviewTab sinceBaseUnavailable={sinceBaseUnavailable} />
                )}

                {/* === DISPLAY TAB === */}
                {activeTab === 'display' && mode === 'review' && (
                  <ReviewDisplayTab isCompactTouchLayout={isCompactTouchLayout} />
                )}

                {activeTab === 'semantic' && mode === 'review' && <SemanticDiffsTab />}

                {activeTab === 'experimental' && mode === 'review' && <ExperimentalTab />}

                {activeTab === 'analysis' && mode === 'review' && (
                  <ReviewAnalysisTab packageChangesSetting={packageChangesSetting} />
                )}

                {activeTab === 'display' && mode !== 'review' && (
                  <>
                    {/* Text size (#2066): the document only, not the app around it */}
                    {showDocumentTextSize && (<>
                    <div className="space-y-3" data-document-text-size-setting>
                      <div>
                        <div className="text-sm font-medium" id="document-text-size-label">文字大小</div>
                        <div className="text-xs text-muted-foreground">
                          {mode === 'annotate' ? '文档正文' : '计划正文'}字号，单位为 px（默认 {DEFAULT_DOCUMENT_TEXT_SIZE}）
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5" role="group" aria-labelledby="document-text-size-label">
                        {DOCUMENT_TEXT_SIZE_OPTIONS.map((value) => (
                          <button
                            key={value}
                            onClick={() => configStore.set('documentTextSize', value)}
                            aria-pressed={documentTextSize === value}
                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors tabular-nums ${
                              documentTextSize === value
                                ? 'bg-background text-foreground shadow-sm font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border" />
                    </>)}

                    {/* Document font (#1657): the document only; code keeps its font */}
                    {showDocumentFont && (<>
                    <div data-document-font-setting>
                      <FontFamilyField
                        label="文档字体"
                        description={`${mode === 'annotate' ? '文档正文' : '计划正文'}的字体；代码仍使用等宽字体`}
                        value={documentFontFamily}
                        onSave={(v) => configStore.set('documentFontFamily', v)}
                        options={DOCUMENT_FONT_OPTIONS}
                        previewStack={documentFontStack}
                        previewText="预览：敏捷的棕色狐狸跳过了懒狗。"
                        customAriaLabel="自定义文档字体名称"
                        customPlaceholder="已安装的字体名称，例如 Iowan Old Style"
                        notFoundText="未找到——文档将保持主题字体"
                      />
                    </div>

                    <div className="border-t border-border" />
                    </>)}

                    {showDocumentTextSize && (<>
                    <div className="flex items-center justify-between" data-document-source-line-numbers-setting>
                      <div>
                        <div className="text-sm font-medium">源码行号</div>
                        <div className="text-xs text-muted-foreground">
                          在{mode === 'annotate' ? '文档' : '计划'}旁显示每个块的源码行
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label="源码行号"
                        aria-checked={documentSourceLineNumbers}
                        onClick={() => configStore.set('documentSourceLineNumbers', !documentSourceLineNumbers)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          documentSourceLineNumbers ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            documentSourceLineNumbers ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="border-t border-border" />
                    </>)}

                    {/* Auto-open Sidebar */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">自动打开侧边栏</div>
                        <div className="text-xs text-muted-foreground">
                          加载时打开带目录的侧边栏
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={uiPrefs.tocEnabled}
                        onClick={() => handleUIPrefsChange({ tocEnabled: !uiPrefs.tocEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          uiPrefs.tocEnabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            uiPrefs.tocEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="border-t border-border" />

                    {/* Sticky Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">固定操作栏</div>
                        <div className="text-xs text-muted-foreground">
                          滚动时保持操作按钮可见
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={uiPrefs.stickyActionsEnabled}
                        onClick={() => handleUIPrefsChange({ stickyActionsEnabled: !uiPrefs.stickyActionsEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          uiPrefs.stickyActionsEnabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            uiPrefs.stickyActionsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="border-t border-border" />

                    {/* Grid Background */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">网格背景</div>
                        <div className="text-xs text-muted-foreground">将计划以网格上的浮动卡片形式显示</div>
                      </div>
                      <button role="switch" aria-checked={gridEnabled} aria-label="网格背景"
                        onClick={() => {
                          configStore.set('gridEnabled', !gridEnabled);
                          // A Settings flip is a real choice: keep it across reloads.
                          markLookAndFeelChoiceResolved();
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gridEnabled ? 'bg-primary' : 'bg-muted'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${gridEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="border-t border-border" />

                    {/* Diagram Shadow */}
                    <div className="space-y-3" data-diagram-shadow-setting>
                      <div>
                        <div className="text-sm font-medium">图表阴影</div>
                        <div className="text-xs text-muted-foreground">
                          为图表节点添加投影（100 表示 Mermaid 自带效果）
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        {DIAGRAM_SHADOW_OPTIONS.map((value) => (
                          <button
                            key={value}
                            onClick={() => configStore.set('diagramShadow', value)}
                            aria-pressed={diagramShadow === value}
                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                              diagramShadow === value
                                ? 'bg-background text-foreground shadow-sm font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {value === 0 ? '无' : String(value)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Plan Width */}
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">{mode === 'annotate' ? '文档宽度' : '计划宽度'}</div>
                        <div className="text-xs text-muted-foreground">
                          {mode === 'annotate' ? '文档卡片的最大宽度' : '计划卡片的最大宽度'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        {PLAN_WIDTH_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => handleUIPrefsChange({ planWidth: opt.id })}
                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                              uiPrefs.planWidth === opt.id
                                ? 'bg-background text-foreground shadow-sm font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Abstract layout preview — exaggerated proportions for visual clarity */}
                      {(() => {
                        const active = PLAN_WIDTH_OPTIONS.find(o => o.id === uiPrefs.planWidth) ?? PLAN_WIDTH_OPTIONS[0];
                        // Exaggerated proportions so the width difference is visually obvious in the small preview
                        const sidebarPct = 14;
                        const panelPct = 14;
                        const cardPctMap: Record<PlanWidth, number> = { compact: 48, default: 70, wide: 94 };
                        const cardPct = cardPctMap[active.id];
                        return (
                          <div className="space-y-2">
                            <div className="rounded-lg border border-border/40 bg-muted/20 px-2 py-3 overflow-hidden">
                              {/* Simulated header bar */}
                              <div className="flex items-center justify-between mb-2 px-1">
                                <div className="h-0.5 w-8 rounded-full bg-foreground/15" />
                                <div className="flex gap-1">
                                  <div className="h-1 w-1 rounded-full bg-foreground/15" />
                                  <div className="h-1 w-1 rounded-full bg-foreground/15" />
                                  <div className="h-1 w-1 rounded-full bg-foreground/15" />
                                </div>
                              </div>
                              <div className="border-t border-foreground/5 mb-2" />
                              {/* Three-column layout */}
                              <div className="flex gap-1 items-stretch" style={{ minHeight: 64 }}>
                                {/* Sidebar */}
                                <div className="flex-shrink-0 space-y-1 pt-0.5 opacity-30" style={{ width: `${sidebarPct}%` }}>
                                  <div className="h-0.5 w-full rounded-full bg-foreground" />
                                  <div className="h-0.5 w-3/4 rounded-full bg-foreground" />
                                  <div className="h-0.5 w-1/2 rounded-full bg-foreground" />
                                  <div className="h-0.5 w-2/3 rounded-full bg-foreground" />
                                  <div className="h-0.5 w-1/2 rounded-full bg-foreground" />
                                </div>
                                {/* Plan card — width animates */}
                                <div className="flex-1 flex justify-center min-w-0">
                                  <div
                                    className="rounded border border-border/60 bg-card/50 p-1.5 space-y-1 transition-all duration-300 ease-out"
                                    style={{ width: `${cardPct}%`, minWidth: 0 }}
                                  >
                                    {/* Heading */}
                                    <div className="h-1 w-2/5 rounded-full bg-foreground/25" />
                                    {/* Prose lines */}
                                    <div className="space-y-[2px]">
                                      <div className="h-[2px] w-full rounded-full bg-foreground/10" />
                                      <div className="h-[2px] w-11/12 rounded-full bg-foreground/10" />
                                      <div className="h-[2px] w-4/5 rounded-full bg-foreground/10" />
                                    </div>
                                    {/* Code block */}
                                    <div className="rounded bg-muted/60 p-1 space-y-[2px]">
                                      <div className="h-[2px] w-full rounded-full bg-primary/20" />
                                      <div className="h-[2px] w-3/4 rounded-full bg-primary/20" />
                                      <div className="h-[2px] w-5/6 rounded-full bg-primary/20" />
                                    </div>
                                    {/* More prose */}
                                    <div className="space-y-[2px]">
                                      <div className="h-[2px] w-full rounded-full bg-foreground/10" />
                                      <div className="h-[2px] w-3/4 rounded-full bg-foreground/10" />
                                    </div>
                                  </div>
                                </div>
                                {/* Annotation panel */}
                                <div className="flex-shrink-0 space-y-1 pt-0.5 opacity-20" style={{ width: `${panelPct}%` }}>
                                  <div className="rounded border border-foreground/20 p-0.5 space-y-[2px]">
                                    <div className="h-[2px] w-full rounded-full bg-foreground" />
                                    <div className="h-[2px] w-2/3 rounded-full bg-foreground" />
                                  </div>
                                  <div className="rounded border border-foreground/20 p-0.5 space-y-[2px]">
                                    <div className="h-[2px] w-full rounded-full bg-foreground" />
                                    <div className="h-[2px] w-1/2 rounded-full bg-foreground" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 leading-snug">
                              {active.px}px — {active.hint}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="border-t border-border" />

                    {/* Tater Mode */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Tater Mode</div>
                      <button
                        role="switch"
                        aria-checked={taterMode}
                        onClick={() => onTaterModeChange(!taterMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          taterMode ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            taterMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </>
                )}

                {/* === SAVING TAB === */}
                {activeTab === 'saving' && (
                  <>
                    {/* Plan Saving — decision snapshots in plans/ are written
                        on plan approve/deny only. */}
                    {mode === 'plan' && (<>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">保存计划</div>
                          <div className="text-xs text-muted-foreground">
                            自动将计划保存到默认数据目录
                          </div>
                        </div>
                        <button
                          role="switch"
                          aria-checked={planSave.enabled}
                          onClick={() => handlePlanSaveChange({ enabled: !planSave.enabled })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            planSave.enabled ? 'bg-primary' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              planSave.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {planSave.enabled && (
                        <div className="space-y-1.5 pl-0.5">
                          <label className="text-xs text-muted-foreground">自定义路径（可选）</label>
                          <input
                            type="text"
                            value={planSave.customPath || ''}
                            onChange={(e) => handlePlanSaveChange({ customPath: e.target.value || null })}
                            placeholder="留空则使用默认值"
                            className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="text-[10px] text-muted-foreground/70">
                            留空则使用默认位置
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border" />
                    </>)}

                    {/* Default Notes App */}
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium">默认保存操作</div>
                        <div className="text-xs text-muted-foreground">
                          用于快捷键（{modKey}+S）
                        </div>
                      </div>
                      <select
                        value={defaultNotesApp}
                        onChange={(e) => handleDefaultNotesAppChange(e.target.value as DefaultNotesApp)}
                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="ask">每次询问</option>
                        <option value="download">下载批注</option>
                        {obsidianDefaultSaveAvailable && <option value="obsidian">Obsidian</option>}
                        {bearDefaultSaveAvailable && <option value="bear">Bear</option>}
                        {octarineDefaultSaveAvailable && <option value="octarine">Octarine</option>}
                        {(notionDefaultSaveAvailable || defaultNotesApp === 'notion') && <option value="notion">Notion</option>}
                      </select>
                      <div className="text-[10px] text-muted-foreground/70">
                        {defaultNotesApp === 'ask'
                          ? '打开导出对话框的「备注」标签页'
                          : defaultNotesApp === 'download'
                            ? `${modKey}+S 下载批注文件`
                            : `${modKey}+S 直接保存到 ${{ obsidian: 'Obsidian', bear: 'Bear', octarine: 'Octarine', notion: 'Notion' }[defaultNotesApp] ?? defaultNotesApp}`}
                      </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Integration links */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        集成
                      </div>
                      <button
                        onClick={() => setActiveTab('obsidian')}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors group"
                      >
                        <span className="text-foreground">Obsidian</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium ${obsidian.enabled ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            {obsidian.enabled ? '已启用' : '关闭'}
                          </span>
                          <svg className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('bear')}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors group"
                      >
                        <span className="text-foreground">Bear 笔记</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium ${bear.enabled ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            {bear.enabled ? '已启用' : '关闭'}
                          </span>
                          <svg className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('octarine')}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors group"
                      >
                        <span className="text-foreground">Octarine</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium ${octarine.enabled ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            {octarine.enabled ? '已启用' : '关闭'}
                          </span>
                          <svg className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* === LABELS TAB === */}
                {activeTab === 'labels' && <QuickLabelsTab />}

                {/* === VIM TAB === */}
                {activeTab === 'vim' && mode !== 'review' && (
                  <VimSettingsTab
                    vimModeEnabled={vimModeEnabled}
                    vimHudEnabled={vimHudEnabled}
                    vimHudKeyPanelEnabled={vimHudKeyPanelEnabled}
                    onVimModeChange={(enabled) => configStore.set('vimModeEnabled', enabled)}
                    onVimHudChange={(enabled) => configStore.set('vimHudEnabled', enabled)}
                    onVimHudKeyPanelChange={(enabled) =>
                      configStore.set('vimHudKeyPanelEnabled', enabled)}
                  />
                )}

                {/* === SHORTCUTS TAB === */}
                {activeTab === 'shortcuts' && (
                  <KeyboardShortcuts mode={mode} vimModeEnabled={vimModeEnabled} />
                )}

                {/* === COMMENTS TAB === */}
                {activeTab === 'comments' && (
                  <CommentsTab />
                )}

                {/* === AI TAB === */}
                {activeTab === 'ai' && (
                  <AISettingsTab
                    providers={aiProviders}
                    selectedProviderId={aiProvider}
                    origin={origin}
                    onProviderChange={setAiProvider}
                  />
                )}

                {/* === FILES TAB === */}
                {activeTab === 'files' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">文件浏览器</div>
                        <div className="text-xs text-muted-foreground">
                          你的项目文件会自动显示。可在下方添加额外目录。
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={fileBrowserSettings.enabled}
                        onClick={() => handleFileBrowserChange({ enabled: !fileBrowserSettings.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          fileBrowserSettings.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            fileBrowserSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {fileBrowserSettings.enabled && (
                      <>
                        <div className="border-t border-border" />

                        {/* Directory list */}
                        {fileBrowserSettings.directories.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">目录</label>
                            {fileBrowserSettings.directories.map((dir) => (
                              <div key={dir} className="flex items-center gap-2 group">
                                <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono truncate" title={dir}>
                                  {dir}
                                </div>
                                <button
                                  onClick={() => handleFileBrowserChange({
                                    directories: fileBrowserSettings.directories.filter((d) => d !== dir),
                                  })}
                                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                                  title="移除目录"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add directory */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">添加目录</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newDirPath}
                              onChange={(e) => setNewDirPath(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addDirectory();
                              }}
                              placeholder="/path/to/directory"
                              className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <button
                              onClick={addDirectory}
                              disabled={!newDirPath.trim()}
                              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              添加
                            </button>
                          </div>
                          <div className="text-[10px] text-muted-foreground/70">
                            添加项目之外包含 Markdown 文件的目录。
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* === HOOKS TAB === */}
                {activeTab === 'hooks' && <HooksTab />}

                {/* === OBSIDIAN TAB === */}
                {activeTab === 'obsidian' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Obsidian 集成</div>
                        <div className="text-xs text-muted-foreground">
                          {mode === 'annotate' ? '从「选项」菜单将文档保存到你的仓库。开启后，计划评审也会把每个已批准的计划保存到此处。' : '自动将已批准的计划保存到你的仓库'}
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={obsidian.enabled}
                        onClick={() => handleObsidianChange({ enabled: !obsidian.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          obsidian.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            obsidian.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {obsidian.enabled && (
                      <>
                        <div className="border-t border-border" />

                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1 space-y-1.5">
                              <label className="text-xs text-muted-foreground">仓库</label>
                              {vaultsLoading ? (
                                <div className="w-full px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
                                  检测中…
                                </div>
                              ) : detectedVaults.length > 0 ? (
                                <>
                                  <select
                                    value={obsidian.vaultPath}
                                    onChange={(e) => handleObsidianChange({ vaultPath: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                                  >
                                    {detectedVaults.map((vault) => (
                                      <option key={vault} value={vault}>
                                        {basenameFromPath(vault)}
                                      </option>
                                    ))}
                                    <option value={CUSTOM_PATH_SENTINEL}>自定义路径…</option>
                                  </select>
                                  {obsidian.vaultPath === CUSTOM_PATH_SENTINEL && (
                                    <input
                                      type="text"
                                      value={obsidian.customPath || ''}
                                      onChange={(e) => handleObsidianChange({ customPath: e.target.value })}
                                      placeholder="/path/to/vault"
                                      className="w-full mt-2 px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                  )}
                                </>
                              ) : (
                                <input
                                  type="text"
                                  value={obsidian.vaultPath}
                                  onChange={(e) => handleObsidianChange({ vaultPath: e.target.value })}
                                  placeholder="/path/to/vault"
                                  className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                              )}
                            </div>

                            <div className="w-44 space-y-1.5">
                              <label className="text-xs text-muted-foreground">文件夹</label>
                              <input
                                type="text"
                                value={obsidian.folder}
                                onChange={(e) => handleObsidianChange({ folder: e.target.value })}
                                placeholder="plannotator"
                                className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">文件名格式</label>
                            <input
                              type="text"
                              value={obsidian.filenameFormat || ''}
                              onChange={(e) => handleObsidianChange({ filenameFormat: e.target.value || undefined })}
                              placeholder={DEFAULT_FILENAME_FORMAT}
                              className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <div className="text-[10px] text-muted-foreground/70">
                              可用变量： <code className="text-[10px]">{'{title}'}</code> <code className="text-[10px]">{'{YYYY}'}</code> <code className="text-[10px]">{'{MM}'}</code> <code className="text-[10px]">{'{DD}'}</code> <code className="text-[10px]">{'{Mon}'}</code> <code className="text-[10px]">{'{D}'}</code> <code className="text-[10px]">{'{HH}'}</code> <code className="text-[10px]">{'{h}'}</code> <code className="text-[10px]">{'{hh}'}</code> <code className="text-[10px]">{'{mm}'}</code> <code className="text-[10px]">{'{ss}'}</code> <code className="text-[10px]">{'{ampm}'}</code>
                            </div>
                            <div className="text-[10px] text-muted-foreground/70">
                              预览： {(() => {
                                const fmt = obsidian.filenameFormat?.trim() || DEFAULT_FILENAME_FORMAT;
                                const now = new Date();
                                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                const h24 = now.getHours(); const h12 = h24 % 12 || 12;
                                const vars: Record<string, string> = {
                                  title: '我的计划标题', YYYY: String(now.getFullYear()),
                                  MM: String(now.getMonth()+1).padStart(2,'0'), DD: String(now.getDate()).padStart(2,'0'),
                                  Mon: months[now.getMonth()], D: String(now.getDate()),
                                  HH: String(h24).padStart(2,'0'), h: String(h12), hh: String(h12).padStart(2,'0'),
                                  mm: String(now.getMinutes()).padStart(2,'0'), ss: String(now.getSeconds()).padStart(2,'0'),
                                  ampm: h24 >= 12 ? 'pm' : 'am',
                                };
                                let preview = fmt.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) + '.md';
                                if (obsidian.filenameSeparator === 'dash') preview = preview.replace(/ /g, '-');
                                else if (obsidian.filenameSeparator === 'underscore') preview = preview.replace(/ /g, '_');
                                return preview;
                              })()}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">文件名分隔符</label>
                            <select
                              value={obsidian.filenameSeparator || 'space'}
                              onChange={(e) => handleObsidianChange({ filenameSeparator: e.target.value as 'space' | 'dash' | 'underscore' })}
                              className="w-full px-3 py-2 bg-muted rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                            >
                              <option value="space">空格（默认）</option>
                              <option value="dash">短横线（-）</option>
                              <option value="underscore">下划线（_）</option>
                            </select>
                            <div className="text-[10px] text-muted-foreground/70">
                              替换生成文件名中的空格。在仓库中配合 CLI 工具使用时很有用。
                            </div>
                          </div>

                          <div className="text-[10px] text-muted-foreground/70">
                            {mode === 'annotate' ? '保存到' : '计划保存到'}: {obsidian.vaultPath === CUSTOM_PATH_SENTINEL
                              ? (obsidian.customPath || '...')
                              : (obsidian.vaultPath || '...')}/{obsidian.folder || 'plannotator'}/
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Frontmatter（自动生成）</label>
                            <pre className="px-3 py-2 bg-muted/50 rounded-lg text-[10px] font-mono text-muted-foreground overflow-x-auto">
{`---
created: ${new Date().toISOString().slice(0, 19)}Z
source: plannotator
tags: [${mode === 'annotate' ? 'plannotator' : 'plan'}, ...]
---`}
                            </pre>
                          </div>

                          <div className="border-t border-border/30" />

                          {mode === 'plan' && (<>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">计划到达时自动保存</div>
                              <div className="text-[10px] text-muted-foreground">
                                计划加载时自动保存到 Obsidian，无需等待你批准或拒绝
                              </div>
                            </div>
                            <button
                              role="switch"
                              aria-checked={obsidian.autoSave}
                              onClick={() => handleObsidianChange({ autoSave: !obsidian.autoSave })}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                obsidian.autoSave ? 'bg-primary' : 'bg-muted'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                obsidian.autoSave ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                          </>)}

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">仓库浏览器</div>
                              <div className="text-[10px] text-muted-foreground">
                                从侧边栏浏览并批注仓库文件
                              </div>
                            </div>
                            <button
                              role="switch"
                              aria-checked={obsidian.vaultBrowserEnabled}
                              onClick={() => handleObsidianChange({ vaultBrowserEnabled: !obsidian.vaultBrowserEnabled })}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                obsidian.vaultBrowserEnabled ? 'bg-primary' : 'bg-muted'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                obsidian.vaultBrowserEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* === BEAR TAB === */}
                {activeTab === 'bear' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Bear 笔记</div>
                        <div className="text-xs text-muted-foreground">
                          {mode === 'annotate' ? '从「选项」菜单将文档保存到 Bear。开启后，计划评审也会把每个已批准的计划保存到此处。' : '自动将已批准的计划保存到 Bear'}
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={bear.enabled}
                        onClick={() => handleBearChange({ enabled: !bear.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          bear.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            bear.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {bear.enabled && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1.5 pl-0.5">
                          <label className="text-xs text-muted-foreground">自定义标签</label>
                          <input
                            type="text"
                            value={bear.customTags}
                            onChange={(e) => handleBearChange({ customTags: e.target.value })}
                            onBlur={(e) => handleBearChange({ customTags: normalizeTags(e.target.value) })}
                            placeholder="plan, work"
                            className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="text-[10px] text-muted-foreground">
                            以逗号分隔，使用 kebab-case。留空则自动生成标签。
                          </div>
                        </div>
                        <div className="space-y-1.5 pl-0.5">
                          <label className="text-xs text-muted-foreground">标签位置</label>
                          <select
                            value={bear.tagPosition}
                            onChange={(e) => handleBearChange({ tagPosition: e.target.value as 'prepend' | 'append' })}
                            className="w-full px-3 py-2 bg-muted rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                          >
                            <option value="append">追加（笔记末尾）</option>
                            <option value="prepend">前置（标题之后）</option>
                          </select>
                        </div>

                        {mode === 'plan' && (<>
                        <div className="border-t border-border/30" />

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium">计划到达时自动保存</div>
                            <div className="text-[10px] text-muted-foreground">
                              计划加载时自动保存到 Bear，无需等待你批准或拒绝
                            </div>
                          </div>
                          <button
                            role="switch"
                            aria-checked={bear.autoSave}
                            onClick={() => handleBearChange({ autoSave: !bear.autoSave })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                              bear.autoSave ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              bear.autoSave ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        </>)}
                      </div>
                    )}
                  </>
                )}

                {/* === OCTARINE TAB === */}
                {activeTab === 'octarine' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Octarine</div>
                        <div className="text-xs text-muted-foreground">
                          {mode === 'annotate' ? '从「选项」菜单将文档保存到 Octarine。开启后，计划评审也会把每个已批准的计划保存到此处。' : '自动将已批准的计划保存到 Octarine'}
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={octarine.enabled}
                        onClick={() => handleOctarineChange({ enabled: !octarine.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          octarine.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            octarine.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {octarine.enabled && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1.5 pl-0.5">
                          <label className="text-xs text-muted-foreground">工作区名称</label>
                          <input
                            type="text"
                            value={octarine.workspace}
                            onChange={(e) => handleOctarineChange({ workspace: e.target.value })}
                            placeholder="我的工作区"
                            className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="text-[10px] text-muted-foreground">
                            计划保存到的 Octarine 工作区名称。
                          </div>
                        </div>
                        <div className="space-y-1.5 pl-0.5">
                          <label className="text-xs text-muted-foreground">文件夹</label>
                          <input
                            type="text"
                            value={octarine.folder}
                            onChange={(e) => handleOctarineChange({ folder: e.target.value })}
                            placeholder="plannotator"
                            className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="text-[10px] text-muted-foreground">
                            工作区内用于保存计划的子文件夹。
                          </div>
                        </div>

                        <div className="text-[10px] text-muted-foreground/70">
                          {mode === 'annotate' ? '保存到' : '计划保存到'}: {octarine.workspace || '...'} / {octarine.folder || 'plannotator'}/
                        </div>

                        {mode === 'plan' && (<>
                        <div className="border-t border-border/30" />

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium">计划到达时自动保存</div>
                            <div className="text-[10px] text-muted-foreground">
                              计划加载时自动保存到 Octarine，无需等待你批准或拒绝
                            </div>
                          </div>
                          <button
                            role="switch"
                            aria-checked={octarine.autoSave}
                            onClick={() => handleOctarineChange({ autoSave: !octarine.autoSave })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                              octarine.autoSave ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              octarine.autoSave ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        </>)}
                      </div>
                    )}
                  </>
                )}

                {/* === NOTION TAB === */}
                {activeTab === 'notion' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Notion</div>
                        <div className="text-xs text-muted-foreground">
                          {mode === 'annotate' ? '从「选项」菜单将文档保存到 Notion。开启后，计划评审也会把每个已批准的计划保存到此处。' : '将已批准的计划保存为 Notion 页面'}
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={notion.enabled}
                        onClick={() => handleNotionChange({ enabled: !notion.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notion.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            notion.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {notion.enabled && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1.5 pl-0.5">
                          <label className="text-xs text-muted-foreground">父页面</label>
                          <input
                            type="text"
                            value={notion.parentPageId}
                            onChange={(e) => handleNotionChange({ parentPageId: e.target.value })}
                            placeholder="https://www.notion.so/..."
                            className="w-full px-3 py-2 bg-muted rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="text-[10px] text-muted-foreground">
                            页面链接或 ID。每次保存都会在其下新增一个页面。请先将其分享给你的 Notion 集成。
                          </div>
                        </div>

                        {mode === 'plan' && (<>
                        <div className="border-t border-border/30" />

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium">计划到达时自动保存</div>
                            <div className="text-[10px] text-muted-foreground">
                              计划加载时自动保存到 Notion，无需等待你批准或拒绝
                            </div>
                          </div>
                          <button
                            role="switch"
                            aria-checked={notion.autoSave}
                            onClick={() => handleNotionChange({ autoSave: !notion.autoSave })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                              notion.autoSave ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              notion.autoSave ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        </>)}
                      </div>
                    )}
                  </>
                )}

              </div>
              </OverlayScrollArea>
            </div>
          </div>
        </div>,
        document.body
      )}

      {themePreview && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none">
          <div className="flex-1" />
          <div
            className="pointer-events-auto w-full bg-card border-t-2 border-primary/30 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] flex flex-col max-h-[35vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
              <span className="text-xs font-medium text-muted-foreground">主题预览</span>
              <button
                onClick={() => { setThemePreview(false); setShowDialog(true); }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                完成
              </button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 min-h-0">
              <ThemeTab compact />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
