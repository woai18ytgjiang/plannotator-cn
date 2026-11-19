// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PermissionMode,
  PERMISSION_MODE_OPTIONS,
  savePermissionModeSettings,
} from '../utils/permissionMode';

interface PermissionModeSetupProps {
  isOpen: boolean;
  onComplete: (mode: PermissionMode) => void;
}

export const PermissionModeSetup: React.FC<PermissionModeSetupProps> = ({
  isOpen,
  onComplete,
}) => {
  const [selectedMode, setSelectedMode] = useState<PermissionMode>('acceptEdits');

  if (!isOpen) return null;

  const handleConfirm = () => {
    savePermissionModeSettings(selectedMode);
    onComplete(selectedMode);
  };

  return createPortal(
    // Same bounded shell as the sibling one-time dialogs (see
    // LookAndFeelAnnouncementDialog): safe-area padding, a card capped to the
    // visible viewport, and the option list as the only scrolling region. The
    // hand-rolled unbounded card used to overflow both edges of a short
    // landscape phone with nothing left to tap.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/90 backdrop-blur-sm"
      style={{
        paddingTop: 'max(1rem, var(--pn-safe-top, 0px))',
        paddingRight: 'max(1rem, var(--pn-safe-right, 0px))',
        paddingBottom: 'max(1rem, var(--pn-safe-bottom, 0px))',
        paddingLeft: 'max(1rem, var(--pn-safe-left, 0px))',
      }}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight:
            'calc(var(--pn-viewport-height, 100vh) - max(1rem, var(--pn-safe-top, 0px)) - max(1rem, var(--pn-safe-bottom, 0px)))',
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <h3 className="font-semibold text-base">新增：权限模式保留</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Claude Code 2.1.7+ 支持在计划批准后保留你的权限模式。
            请选择偏好的自动化级别。
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            需要 Claude Code 2.1.7 或更高版本。运行 <code className="bg-muted px-1 rounded">claude update</code> 进行更新。
          </p>
        </div>

        {/* Options */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-2">
          {PERMISSION_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                selectedMode === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <input
                type="radio"
                name="permissionMode"
                value={option.value}
                checked={selectedMode === option.value}
                onChange={() => setSelectedMode(option.value)}
                className="mt-0.5 accent-primary"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex flex-shrink-0 flex-wrap gap-2 justify-between items-center">
          <p className="text-xs text-muted-foreground">
            之后可在「设置」中修改。
          </p>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            继续
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
