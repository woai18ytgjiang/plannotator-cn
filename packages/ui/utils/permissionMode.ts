// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * Permission Mode Settings Utility (Claude Code only)
 *
 * Manages the preferred permission mode to restore after plan approval.
 * Claude Code 2.1.7+ supports updatedPermissions in hook responses.
 *
 * Available modes:
 * - acceptEdits: Auto-approve file edits only
 * - auto: Autonomous execution gated by a model-based safety classifier (Claude Code 2026-03+, Sonnet 4.6+)
 * - bypassPermissions: Auto-approve all tool calls
 * - default: Manually approve each tool call
 */

import { storage } from './storage';

const STORAGE_KEY_MODE = 'plannotator-permission-mode';
const STORAGE_KEY_CONFIGURED = 'plannotator-permission-mode-configured';

export type PermissionMode = 'bypassPermissions' | 'acceptEdits' | 'auto' | 'default';

export interface PermissionModeSettings {
  mode: PermissionMode;
  configured: boolean; // Whether user has explicitly set this
}

export const PERMISSION_MODE_OPTIONS: { value: PermissionMode; label: string; description: string }[] = [
  {
    value: 'acceptEdits',
    label: '自动接受编辑',
    description: '自动批准文件编辑，其他工具仍需询问',
  },
  {
    value: 'auto',
    label: '自动模式',
    description: '带安全分类器的自主执行（需要 Claude Code 2026-03+ 和 Sonnet 4.6+）',
  },
  {
    value: 'bypassPermissions',
    label: '绕过权限',
    description: '自动批准所有工具调用（等同于 --dangerously-skip-permissions）',
  },
  {
    value: 'default',
    label: '手动批准',
    description: '逐个手动批准每次工具调用',
  },
];

const DEFAULT_MODE: PermissionMode = 'acceptEdits';

/**
 * Get current permission mode settings from storage
 */
export function getPermissionModeSettings(): PermissionModeSettings {
  const mode = storage.getItem(STORAGE_KEY_MODE) as PermissionMode | null;
  const configured = storage.getItem(STORAGE_KEY_CONFIGURED) === 'true';

  return {
    mode: mode || DEFAULT_MODE,
    configured,
  };
}

/**
 * Save permission mode settings to storage
 */
export function savePermissionModeSettings(mode: PermissionMode): void {
  storage.setItem(STORAGE_KEY_MODE, mode);
  storage.setItem(STORAGE_KEY_CONFIGURED, 'true');
}

/**
 * Check if the user needs to configure their permission mode preference
 */
export function needsPermissionModeSetup(): boolean {
  return storage.getItem(STORAGE_KEY_CONFIGURED) !== 'true';
}
