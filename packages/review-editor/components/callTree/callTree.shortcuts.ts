import { createShortcutScopeHook, defineShortcutScope } from '@plannotator/ui/shortcuts';

/**
 * Keys inside a Call tree (the tree has keyboard focus). They are bound to
 * the tree element, not the window, and stop there, so the file tree's
 * arrow keys and the All files `C` never see them. Enter opens the line and
 * C comments: the owner's decision of 2026-11-10 (the Paths cards keep their
 * own click-to-comment).
 */
export const reviewCallTreeShortcuts = defineShortcutScope({
  id: 'review-call-tree',
  title: '调用树',
  shortcuts: {
    moveDown: {
      description: '向下移动',
      bindings: ['ArrowDown'],
      section: '调用树',
      hint: '当调用树获得焦点时。',
      preventDefault: true,
      displayOrder: 10,
    },
    moveUp: {
      description: '向上移动',
      bindings: ['ArrowUp'],
      section: '调用树',
      preventDefault: true,
      displayOrder: 20,
    },
    fold: {
      description: '折叠',
      bindings: ['ArrowLeft'],
      section: '调用树',
      hint: '在已折叠或无子行的行上，移动到其调用方。',
      preventDefault: true,
      displayOrder: 30,
    },
    unfold: {
      description: '展开',
      bindings: ['ArrowRight'],
      section: '调用树',
      hint: '在展开的行上，移动到其第一个调用。',
      preventDefault: true,
      displayOrder: 40,
    },
    open: {
      description: '在差异中打开',
      bindings: ['Enter'],
      section: '调用树',
      hint: '在对应行打开该行所属的文件。',
      preventDefault: true,
      displayOrder: 50,
    },
    comment: {
      description: '评论',
      bindings: ['C'],
      section: '调用树',
      hint: '评论会落在该行所属文件的行上，像行内评论一样。',
      preventDefault: true,
      displayOrder: 60,
    },
    back: {
      description: '返回',
      bindings: ['Escape'],
      section: '调用树',
      hint: '从变更块打开的树会返回到该变更块。',
      displayOrder: 70,
    },
  },
});

export const useReviewCallTreeShortcuts = createShortcutScopeHook(reviewCallTreeShortcuts);
