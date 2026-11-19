// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * The update results Plannotator tells apart (safe updates, step 1). One
 * definition for the server (packages/server/auto-update.ts), `plannotator
 * update`, and the Inbox's failure dialog, so the three never drift.
 */

/**
 * install.sh stopped because the binary did not match the checksum Plannotator
 * fetched, before it replaced anything. Recorded only when install.sh also
 * wrote the update wrapper's marker file; any other exit with this number is
 * recorded as 1.
 */
export const UPDATE_EXIT_CHECKSUM_MISMATCH = 113;

/** Plannotator could not download the install script or the checksum: nothing ran (sysexits EX_TEMPFAIL). */
export const UPDATE_EXIT_DOWNLOAD_FAILED = 75;

/** Run from a terminal to stage the update in another temp folder. */
export const UPDATE_OTHER_TMPDIR_COMMAND = "TMPDIR=/another/folder plannotator update";

/**
 * What to do about a temp folder that could not hold the update, by its
 * cause: a phrase the caller ends with ", then …".
 * `reason` is update-prepare's own text ("the temp folder X is full (ENOSPC)",
 * "... can't be written (EACCES)", "... does not exist (ENOENT)"). One wording
 * for `plannotator update` and the Inbox's failure dialog.
 */
export function updateStagingAdvice(reason: string): string {
  if (/ is full \(/.test(reason)) return "请在那里腾出一些空间";
  if (/ can't be written \(/.test(reason)) return "请让它可写";
  if (/ does not exist \(/.test(reason)) return "请创建它";
  return "请检查该文件夹";
}
