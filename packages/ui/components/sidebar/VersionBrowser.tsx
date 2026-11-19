// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * VersionBrowser — Version list for plan diff
 *
 * Shows all versions of the current plan and allows selecting
 * which version to diff against.
 */

import React, { useEffect } from "react";
import type { VersionInfo, VersionEntry } from "../../hooks/usePlanDiff";

interface VersionBrowserProps {
  versionInfo: VersionInfo | null;
  versions: VersionEntry[];
  selectedBaseVersion: number | null;
  onSelectBaseVersion: (version: number) => void;
  isPlanDiffActive: boolean;
  hasPreviousVersion: boolean;
  onActivatePlanDiff: () => void;
  isLoading: boolean;
  isSelectingVersion: boolean;
  fetchingVersion: number | null;
  onFetchVersions: () => void;
}

function relativeTime(timestamp: string): string {
  if (!timestamp) return "";
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(timestamp).toLocaleDateString();
}

export const VersionBrowser: React.FC<VersionBrowserProps> = ({
  versionInfo,
  versions,
  selectedBaseVersion,
  onSelectBaseVersion,
  isPlanDiffActive,
  hasPreviousVersion,
  onActivatePlanDiff,
  isLoading,
  isSelectingVersion,
  fetchingVersion,
  onFetchVersions,
}) => {
  // Fetch version list once versionInfo is available
  useEffect(() => {
    if (versionInfo && versions.length === 0) {
      onFetchVersions();
    }
  }, [versionInfo, versions.length, onFetchVersions]);

  if (!versionInfo) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        没有可用的版本历史。
      </div>
    );
  }

  const currentVersion = versionInfo.version;
  const totalVersions = versionInfo.totalVersions;

  return (
    <div className="p-3">
      {/* Current version info */}
      <div className="mb-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
          当前计划
        </div>
        <div className="text-xs text-foreground">
          版本 {currentVersion} / 共 {totalVersions}
        </div>
      </div>

      {/* Show Diff button if not active */}
      {hasPreviousVersion && !isPlanDiffActive && (
        <button
          onClick={onActivatePlanDiff}
          className="w-full mb-3 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        >
          显示更改
        </button>
      )}

      {/* Version list */}
      {totalVersions > 1 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            对比基准
          </div>

          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2 text-center">
              加载中…
            </div>
          ) : (
            <div className="space-y-0.5">
              {versions
                .filter((v) => v.version !== currentVersion)
                .reverse()
                .map((v) => {
                  const isSelected = selectedBaseVersion === v.version;
                  return (
                    <button
                      key={v.version}
                      onClick={() => onSelectBaseVersion(v.version)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "text-foreground hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          v{v.version}
                          {v.version === currentVersion - 1 && (
                            <span className="ml-1 text-muted-foreground font-normal">
                              （上一版）
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {fetchingVersion === v.version ? "加载中…" : relativeTime(v.timestamp)}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
