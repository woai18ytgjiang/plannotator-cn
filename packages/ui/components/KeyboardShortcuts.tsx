// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import React from 'react';
import {
  formatShortcutBindingTokens,
  listScopeShortcuts,
  resolveShortcutBindings,
  reviewExplorerShortcuts,
  reviewMarkdownPreviewShortcuts,
  vimSelectionShortcuts,
  type ShortcutScopeDefinition,
} from '../shortcuts';
import { isMac, modKey, altKey } from '../utils/platform';

/* ─── Key cap component ─── */

const Kbd: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
  <kbd
    className={`inline-flex items-center justify-center h-[22px] ${
      wide ? 'min-w-[22px] px-1.5' : 'min-w-[22px]'
    } rounded bg-muted border border-border/60 border-b-[2px] text-[11px] font-mono leading-none text-foreground/80 shadow-sm`}
  >
    {children}
  </kbd>
);

/* ─── Key combo renderer ─── */

const Keys: React.FC<{ keys: string[] }> = ({ keys }) => (
  <span className="inline-flex items-center gap-0.5">
    {keys.map((k, i) => (
      <Kbd key={i} wide={k.length > 1}>{k}</Kbd>
    ))}
  </span>
);

/* ─── Shortcut row ─── */

const ShortcutRow: React.FC<{ keys: string[]; desc: string; hint?: string }> = ({ keys, desc, hint }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-muted-foreground">
      {desc}
      {hint && (
        <span className="relative group ml-1 inline-flex">
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-medium bg-muted-foreground/15 text-muted-foreground/60 cursor-default">?</span>
          <span className="absolute bottom-full left-0 mb-1.5 px-2.5 py-1.5 rounded bg-foreground text-background text-[11px] leading-snug w-[320px] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
            {hint}
          </span>
        </span>
      )}
    </span>
    <Keys keys={keys} />
  </div>
);

/* ─── Section ─── */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-0.5">
    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
      {title}
    </div>
    {children}
  </div>
);

/* ─── Platform-aware key names ─── */

const enter = isMac ? '⏎' : '↵';
const shiftKey = isMac ? '⇧' : 'Shift';

/* ─── Shortcut data ─── */

interface Shortcut {
  keys: string[];
  desc: string;
  hint?: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

const inputMethodShortcuts: ShortcutSection = {
  title: '输入方式',
  shortcuts: [
    { keys: [altKey, 'hold'], desc: '临时切换模式', hint: '按住可在「选择」和「精确定位」之间切换，松开还原' },
    { keys: [altKey, altKey], desc: '切换模式', hint: '双击可在「选择」和「精确定位」之间永久切换' },
  ],
};

const documentViewShortcuts: ShortcutSection = {
  title: '视图',
  shortcuts: [
    { keys: [modKey, '.'], desc: '切换专注模式', hint: '同时收起目录侧边栏和右侧面板；再次按下可恢复之前打开的内容。仅适用于 Markdown 文档；HTML 页面保留自身的布局。' },
    { keys: [modKey, 'E'], desc: '切换编辑模式', hint: '就地打开 Markdown 源码编辑器，并保持你的滚动位置；再次按下可提交修改并返回批注。仅适用于 Markdown 文档；有未保存修改的源文件文档仍保留两步丢弃流程。' },
  ],
};

const annotationShortcuts: ShortcutSection = {
  title: '批注',
  shortcuts: [
    { keys: [shiftKey, '1-4'], desc: '切换批注模式', hint: '1 标注、2 评论、3 删改、4 标签——与工具条顺序一致' },
    { keys: ['a-z'], desc: '直接开始输入评论', hint: '批注工具栏打开时，按任意字母键即可用该字符打开评论编辑器' },
    { keys: [altKey, '1-0'], desc: '应用快捷标签', hint: '立即应用第 N 个预设标签（0 表示第 10 个）。标签选择器打开时，直接按数字也可生效。' },
    { keys: [modKey, enter], desc: '提交评论' },
    { keys: [modKey, 'C'], desc: '复制选中文本' },
    { keys: ['Esc'], desc: '关闭工具栏 / 取消' },
  ],
};

const imageAnnotatorShortcuts: ShortcutSection = {
  title: '图片批注器',
  shortcuts: [
    { keys: ['1'], desc: '画笔工具' },
    { keys: ['2'], desc: '箭头工具' },
    { keys: ['3'], desc: '圆形工具' },
    { keys: [modKey, 'Z'], desc: '撤销' },
    { keys: [enter], desc: '完成' },
    { keys: ['Esc'], desc: '取消' },
  ],
};

const sharedPlanEditorShortcuts: ShortcutSection[] = [
  documentViewShortcuts,
  inputMethodShortcuts,
  annotationShortcuts,
  imageAnnotatorShortcuts,
];

const vimShortcuts: ShortcutSection[] = (() => {
  const sections = new Map<string, Shortcut[]>();
  const entries = listScopeShortcuts(vimSelectionShortcuts)
    .sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0));

  for (const entry of entries) {
    const shortcuts = sections.get(entry.section) ?? [];
    shortcuts.push({
      keys: formatShortcutBindingTokens(entry.bindings[0] ?? ''),
      desc: entry.description,
      hint: entry.hint,
    });
    sections.set(entry.section, shortcuts);
  }

  return Array.from(sections, ([title, shortcuts]) => ({ title, shortcuts }));
})();

/** Sections read from registry scopes (this system's keys), so they cannot drift. */
function scopeSections(scope: ShortcutScopeDefinition<any>): ShortcutSection[] {
  const sections = new Map<string, Shortcut[]>();
  const entries = listScopeShortcuts(scope)
    .sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0));
  for (const entry of entries) {
    const shortcuts = sections.get(entry.section) ?? [];
    shortcuts.push({
      keys: formatShortcutBindingTokens(resolveShortcutBindings(entry)[0] ?? ''),
      desc: entry.description,
      hint: entry.hint,
    });
    sections.set(entry.section, shortcuts);
  }
  return Array.from(sections, ([title, shortcuts]) => ({ title, shortcuts }));
}

const planActionShortcuts: ShortcutSection = {
  title: '操作',
  shortcuts: [
    { keys: [modKey, enter], desc: '提交 / 批准' },
    { keys: [modKey, 'S'], desc: '保存到笔记应用' },
    { keys: [modKey, 'P'], desc: '打印计划' },
    { keys: ['Esc'], desc: '关闭对话框' },
  ],
};

const annotateActionShortcuts: ShortcutSection = {
  title: '操作',
  shortcuts: [
    { keys: [modKey, enter], desc: '发送批注' },
    { keys: [modKey, 'S'], desc: '保存到笔记应用' },
    { keys: [modKey, 'P'], desc: '打印文档' },
  ],
};

const annotateSidebarShortcuts: ShortcutSection = {
  title: '侧边栏',
  shortcuts: [
    { keys: [modKey, 'B'], desc: '切换目录侧边栏' },
    { keys: [modKey, shiftKey, 'B'], desc: '切换文件侧边栏', hint: '显示「文件」标签页时可用。' },
    { keys: [shiftKey, shiftKey], desc: '切换智能体 TUI 侧边栏', hint: '显示智能体控件时可用。' },
  ],
};

const planShortcuts: ShortcutSection[] = [
  planActionShortcuts,
  ...sharedPlanEditorShortcuts,
];

const annotateShortcuts: ShortcutSection[] = [
  annotateActionShortcuts,
  annotateSidebarShortcuts,
  ...sharedPlanEditorShortcuts,
];

const reviewShortcuts: ShortcutSection[] = [
  {
    title: '操作',
    shortcuts: [
      { keys: [modKey, enter], desc: '批准 / 发送反馈' },
      { keys: [modKey, shiftKey, 'Y'], desc: '复制反馈', hint: '复制的反馈与提交的内容相同' },
      { keys: [altKey, altKey], desc: '切换目标', hint: '双击可在 PR 审查模式下于 GitHub 和智能体之间切换' },
      { keys: [modKey, 'B'], desc: '切换文件树' },
      { keys: [modKey, '.'], desc: '切换侧边栏' },
      { keys: ['Esc'], desc: '收起侧边栏' },
    ],
  },
  {
    title: '文件导航',
    shortcuts: [
      { keys: ['J'], desc: '下一个文件' },
      { keys: ['K'], desc: '上一个文件' },
      { keys: ['['], desc: '滚动到上一个文件', hint: '在全部文件视图中，将视口滚动到上一个文件' },
      { keys: [']'], desc: '滚动到下一个文件', hint: '在全部文件视图中，将视口滚动到下一个文件' },
      { keys: ['Home'], desc: '第一个文件' },
      { keys: ['End'], desc: '最后一个文件' },
    ],
  },
  {
    title: '文件操作',
    shortcuts: [
      { keys: ['V'], desc: '切换已查看状态', hint: '在全部文件视图中，还会折叠该文件' },
      { keys: ['A'], desc: '切换 git add / 暂存' },
      { keys: ['C'], desc: '文件评论', hint: '在全部文件视图中，为目标文件打开评论浮层' },
      { keys: ['X'], desc: '折叠 / 展开文件', hint: '在全部文件视图中，切换目标文件的展开状态' },
      { keys: ['Z'], desc: '撤销折叠', hint: '重新打开上次折叠的文件并滚动到它' },
    ],
  },
  ...scopeSections(reviewExplorerShortcuts),
  ...scopeSections(reviewMarkdownPreviewShortcuts),
  {
    title: '批注',
    shortcuts: [
      { keys: [modKey, enter], desc: '提交评论' },
      { keys: ['Tab'], desc: '在编辑器中缩进' },
      { keys: ['Esc'], desc: '关闭工具栏 / 取消' },
    ],
  },
];

/* ─── Exported panel ─── */

/** Render the surface shortcut reference, including opt-in Vim commands. */
export const KeyboardShortcuts: React.FC<{
  mode: 'plan' | 'annotate' | 'review';
  vimModeEnabled?: boolean;
}> = ({ mode, vimModeEnabled = false }) => {
  const baseSections = mode === 'review'
    ? reviewShortcuts
    : mode === 'annotate'
      ? annotateShortcuts
      : planShortcuts;
  const sections = vimModeEnabled && mode !== 'review'
    ? [...vimShortcuts, ...baseSections]
    : baseSections;

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.shortcuts.map((s, i) => (
            <ShortcutRow key={i} keys={s.keys} desc={s.desc} hint={s.hint} />
          ))}
        </Section>
      ))}
    </div>
  );
};
