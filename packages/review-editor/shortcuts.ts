import {
  createDoubleTapShortcutsHook,
  createShortcutRegistry,
  createShortcutScopeHook,
  decisionControlShortcuts,
  defineShortcutScope,
  historyShortcuts,
  reviewAiShortcuts,
  reviewAllFilesDiffShortcuts,
  reviewAnnotationToolbarShortcuts,
  reviewFileTreeShortcuts,
  reviewPrCommentsShortcuts,
  reviewSuggestionModalShortcuts,
  reviewMarkdownPreviewShortcuts,
  reviewExplorerShortcuts,
  type ShortcutSurface,
} from '@plannotator/ui/shortcuts';
import { reviewCallTreeShortcuts } from './components/callTree/callTree.shortcuts';

export const reviewEditorShortcuts = defineShortcutScope({
  id: 'review-editor',
  title: '审查编辑器',
  shortcuts: {
    submit: {
      description: '批准 / 发送反馈（取决于顶部显示的操作）',
      bindings: ['Mod+Enter'],
      section: '操作',
      hint: '触发顶部的主操作：无批注时批准，否则发送反馈。',
      displayOrder: 10,
    },
    openDecisionNote: {
      description: '附言发送',
      bindings: ['Mod+Shift+Enter'],
      section: '操作',
      hint: '打开发送菜单的备注输入框；随后 Mod+Enter 会一并发送审查和备注。',
      displayOrder: 15,
    },
    copyFeedback: {
      description: '复制反馈到剪贴板',
      bindings: ['Mod+Shift+Y'],
      section: '操作',
      displayOrder: 20,
    },
    focusSearch: {
      description: '聚焦搜索',
      bindings: ['Mod+F'],
      section: '搜索',
      hint: '当文件树搜索栏可见时可用。',
      displayOrder: 10,
    },
    nextSearchMatch: {
      description: '下一个搜索结果',
      bindings: ['Enter', 'F3'],
      section: '搜索',
      displayOrder: 20,
    },
    prevSearchMatch: {
      description: '上一个搜索结果',
      bindings: ['Shift+Enter', 'Shift+F3'],
      section: '搜索',
      displayOrder: 30,
    },
    clearSearch: {
      description: '清除搜索 / 关闭面板',
      bindings: ['Escape'],
      section: '搜索',
      displayOrder: 40,
    },
    toggleDestination: {
      description: '切换审查目标',
      bindings: ['Alt Alt'],
      section: '操作',
      hint: '在 PR 审查模式下双击可在平台与智能体之间切换。',
      displayOrder: 30,
    },
    toggleFileTree: {
      description: '切换文件树',
      bindings: ['Mod+B'],
      section: '布局',
      displayOrder: 10,
    },
    toggleSidebar: {
      description: '切换审查侧边栏',
      bindings: ['Mod+.'],
      section: '布局',
      displayOrder: 20,
    },
    toggleGuide: {
      description: '切换引导式审查',
      bindings: ['Mod+Shift+G'],
      section: '布局',
      hint: '打开或关闭引导式审查的全屏界面。',
      displayOrder: 40,
    },
    toggleViewed: {
      description: '切换文件已查看状态',
      bindings: ['V'],
      section: '文件操作',
      hint: '将当前差异文件标记为已查看（在全部文件视图中会自动折叠）。',
      displayOrder: 10,
    },
    stageFile: {
      description: '暂存当前文件',
      bindings: ['A'],
      section: '文件操作',
      hint: '在支持暂存时可用（PR 审查模式下不可用）。',
      displayOrder: 20,
    },
    nextChange: {
      description: '下一个更改',
      bindings: ['N'],
      section: '文件导航',
      hint: '滚动到下一段更改的行：在打开的文件中，或在全部文件中跨已展开的文件。已折叠的文件和以渲染方式显示的 Markdown 文件会被跳过。',
      displayOrder: 50,
    },
    prevChange: {
      description: '上一个更改',
      bindings: ['Shift+N'],
      section: '文件导航',
      hint: '滚动到上一段更改的行。',
      displayOrder: 60,
    },
  },
});

export const useReviewEditorShortcuts = createShortcutScopeHook(reviewEditorShortcuts);
export const useReviewEditorDoubleTap = createDoubleTapShortcutsHook(reviewEditorShortcuts);

export const reviewSettingsShortcutRegistry = createShortcutRegistry([
  reviewEditorShortcuts,
  decisionControlShortcuts,
  historyShortcuts,
  reviewFileTreeShortcuts,
  reviewExplorerShortcuts,
  reviewCallTreeShortcuts,
  reviewAllFilesDiffShortcuts,
  reviewMarkdownPreviewShortcuts,
  reviewAnnotationToolbarShortcuts,
  reviewSuggestionModalShortcuts,
  reviewAiShortcuts,
  reviewPrCommentsShortcuts,
] as const);

export const codeReviewSurface: ShortcutSurface = {
  slug: 'code-review',
  title: '代码审查',
  description: '代码审查界面中提供的快捷键。',
  registry: reviewSettingsShortcutRegistry,
};
