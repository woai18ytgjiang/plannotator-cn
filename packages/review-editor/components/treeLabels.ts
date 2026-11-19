import type { FileTreeLabelsOption } from '@pierre/trees';

/**
 * The file tree (@pierre/trees) draws its own search box and context menu
 * trigger. Its defaults are English; these are the product's Chinese words,
 * passed to every useFileTree call so the tree matches the rest of the UI.
 */
export const TREE_LABELS: FileTreeLabelsOption = {
  searchPlaceholder: '搜索文件…',
  contextMenuTrigger: '选项',
  renameItem: (itemName: string) => `重命名 ${itemName}`,
  gitStatusTitles: {
    added: 'Git 状态：新增',
    deleted: 'Git 状态：删除',
    ignored: 'Git 状态：忽略',
    modified: 'Git 状态：修改',
    renamed: 'Git 状态：重命名',
    untracked: 'Git 状态：未跟踪',
  },
  containsGitStatusTitle: '包含 Git 状态项',
};
