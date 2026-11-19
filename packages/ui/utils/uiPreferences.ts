// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import { storage } from './storage';

const STORAGE_KEY_TOC = 'plannotator-toc-enabled';
const STORAGE_KEY_STICKY_ACTIONS = 'plannotator-sticky-actions-enabled';
const STORAGE_KEY_PLAN_WIDTH = 'plannotator-plan-width';

export type PlanWidth = 'compact' | 'default' | 'wide';

export const PLAN_WIDTH_OPTIONS: { id: PlanWidth; label: string; px: number; hint: string }[] = [
  { id: 'compact', label: '紧凑', px: 832, hint: '最适合阅读。笔记本和专注审查时的理想行宽。' },
  { id: 'default', label: '默认', px: 1040, hint: '均衡。为代码块留出更多空间，同时不牺牲可读性。' },
  { id: 'wide', label: '宽屏', px: 1280, hint: '适合大屏显示器。图表和宽代码效果最佳。' },
];

export interface UIPreferences {
  tocEnabled: boolean;
  stickyActionsEnabled: boolean;
  planWidth: PlanWidth;
}

export function getUIPreferences(): UIPreferences {
  const width = storage.getItem(STORAGE_KEY_PLAN_WIDTH);
  return {
    tocEnabled: storage.getItem(STORAGE_KEY_TOC) !== 'false',
    stickyActionsEnabled: storage.getItem(STORAGE_KEY_STICKY_ACTIONS) !== 'false',
    planWidth: (width === 'compact' || width === 'default' || width === 'wide') ? width : 'compact',
  };
}

export function saveUIPreferences(prefs: UIPreferences): void {
  storage.setItem(STORAGE_KEY_TOC, String(prefs.tocEnabled));
  storage.setItem(STORAGE_KEY_STICKY_ACTIONS, String(prefs.stickyActionsEnabled));
  storage.setItem(STORAGE_KEY_PLAN_WIDTH, prefs.planWidth);
}
