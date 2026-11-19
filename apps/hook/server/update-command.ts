/**
 * `plannotator update [--check]`: install the newest stable release now.
 *
 * It runs the same thing as background auto-update and the Inbox's Update
 * now: the install script for the pinned tag with the remembered install
 * flags, under update.lock, logging to update.log and recording
 * update-result.json (packages/server/auto-update.ts). Here it runs in the
 * foreground so the person sees the installer's output as it happens.
 *
 * Asking GitHub is an explicit action, so it happens even when automatic
 * update checks are off (PLANNOTATOR_UPDATE_CHECK=0); it says so.
 *
 * Exit codes: 0 up to date, updated, or `--check`; 1 the update could not run
 * or failed (including a download that did not match its checksum, or one
 * that could not be downloaded: the old binary is kept either way); 2 usage.
 */

import { homedir } from "node:os";
import { loadConfig, parseUpdateCheckEnv, resolveUpdateCheck } from "@plannotator/shared/config";
import { getPlannotatorDataDir } from "@plannotator/shared/data-dir";
import { readInboxRegistry } from "@plannotator/shared/inbox/registry";
import {
  CLAUDE_PLUGIN_UPDATE_COMMANDS,
  installCommandFor,
  installerFlagArgs,
  isNewerStableVersion,
  parseStableVersion,
  knownLatestRelease,
  readInstallFlags,
  readUpdateState,
  releaseUrlFor,
  runReleaseCheck,
  type FetchReleaseResult,
} from "@plannotator/shared/update-check";
import {
  autoUpdatePaths,
  beginManualUpdate,
  isManagedBinary,
  managedBinaryPath,
  runInstallerForeground,
  UPDATE_CHECKSUM_MISMATCH,
  UPDATE_PREPARE_FAILED,
  type InstallerLaunch,
} from "@plannotator/server/auto-update";
import { stagingFailureIn, tlsFailureIn, withoutLogOnlyLines } from "@plannotator/server/update-log";
import { UPDATE_OTHER_TMPDIR_COMMAND, updateStagingAdvice } from "@plannotator/core/update-exit-codes";
import { UPDATE_COMMAND_USAGE } from "./cli";

export interface UpdateCommandDeps {
  currentVersion: string | undefined;
  dataDir?: string;
  execPath?: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  out?: (text: string) => void;
  err?: (text: string) => void;
  fetchReleasePage?: () => Promise<FetchReleaseResult>;
  fetchRelease?: () => Promise<FetchReleaseResult>;
  runInstaller?: (launch: InstallerLaunch, write: (chunk: string) => void) => Promise<number>;
}

function checksOffSource(env: NodeJS.ProcessEnv): string | null {
  const fromEnv = parseUpdateCheckEnv(env);
  if (fromEnv === false) return "PLANNOTATOR_UPDATE_CHECK=0";
  if (fromEnv === true) return null;
  return resolveUpdateCheck(loadConfig(), env) ? null : '{ "updateCheck": false } in config.json';
}

export async function runUpdateCommand(args: string[], deps: UpdateCommandDeps): Promise<number> {
  const out = deps.out ?? ((t: string) => process.stdout.write(t));
  const err = deps.err ?? ((t: string) => process.stderr.write(t));
  const env = deps.env ?? process.env;
  const platform = deps.platform ?? process.platform;
  const dataDir = deps.dataDir ?? getPlannotatorDataDir();
  const now = deps.now ?? Date.now;

  let checkOnly = false;
  for (const arg of args) {
    if (arg === "--check") checkOnly = true;
    else {
      err(`未知选项：${arg}\n\n${UPDATE_COMMAND_USAGE}\n`);
      return 2;
    }
  }

  const current = deps.currentVersion;
  const flags = readInstallFlags(dataDir).flags;
  const command = installCommandFor(platform, flags);
  if (!current || !parseStableVersion(current)) {
    err(
      "这是 Plannotator 的开发构建（没有发布版本号），因此无需更新。\n" +
        `要安装发布版本：${command}\n`,
    );
    return 1;
  }

  const off = checksOffSource(env);
  if (off) err(`更新检查已关闭（${off}）。因为是你主动请求的，仍会检查。\n`);

  const checked = await runReleaseCheck({
    dataDir,
    now,
    enabled: () => true,
    force: true,
    ...(deps.fetchReleasePage && { fetchReleasePage: deps.fetchReleasePage }),
    ...(deps.fetchRelease && { fetchRelease: deps.fetchRelease }),
  });
  if (checked.outcome === "failed") {
    // The install script finds the newest release on its own (the API, else
    // the release page), so it works when this check does not.
    err(
      `无法向 GitHub 查询最新发布：${checked.error}\n` +
        `如仍要安装最新发布，请运行：\n  ${command}\n`,
    );
    return 1;
  }
  const latest = knownLatestRelease(readUpdateState(dataDir))?.version ?? null;
  if (!latest || !isNewerStableVersion(latest, current)) {
    out(`已安装 Plannotator ${current}。已是最新版本（刚刚检查过）。\n`);
    return 0;
  }

  out(`Plannotator ${latest} 可用（你当前是 ${current}）。\n`);
  if (checkOnly) {
    out(`更新：plannotator update\n更新内容：${releaseUrlFor(latest)}\n`);
    return 0;
  }

  const execPath = deps.execPath ?? process.execPath;
  const home = env.HOME || homedir();
  const managed = isManagedBinary(execPath, platform, env, home);
  const begun = beginManualUpdate({
    currentVersion: current,
    dataDir,
    now,
    platform,
    isManaged: () => managed,
  });
  if (begun.outcome === "unmanaged") {
    err(
      "这份 Plannotator 不是由安装脚本安装的，因此无法自行更新\n" +
        `（安装脚本管理的是 ${managedBinaryPath(platform, env, home)}）。请运行：\n  ${command}\n`,
    );
    return 1;
  }
  if (begun.outcome === "locked") {
    err(`另一个更新已在运行。它的输出位于 ${autoUpdatePaths(dataDir).log}\n`);
    return 1;
  }
  if (begun.outcome !== "ready") {
    out(`已安装 Plannotator ${current}。已是最新版本。\n`);
    return 0;
  }

  const shown = installerFlagArgs(begun.launch.flags, platform);
  out(
    shown.length > 0
      ? `正在安装 v${latest}，沿用你上次安装时的选择：${shown.join(" ")}\n`
      : `正在安装 v${latest}。\n`,
  );
  const run = deps.runInstaller ?? runInstallerForeground;
  let printed = "";
  const code = await run(begun.launch, (text) => {
    printed += text;
    // Notes meant for update.log only (the tee still writes them there).
    const shown = withoutLogOnlyLines(text);
    if (shown) out(shown);
  });
  if (code === 130) {
    err(
      `更新已中断。Plannotator 仍是 ${current}；锁已释放，你随时可以再次运行 plannotator update。\n`,
    );
    return 130;
  }
  // Safe updates: never the `curl | bash` line here. After a mismatch it
  // would send the person through the very connection that just failed.
  if (code === UPDATE_CHECKSUM_MISMATCH) {
    err(
      `更新到 ${latest} 已停止：下载内容与 Plannotator 获取的校验和不一致。\n` +
        `${current} 仍已安装且可正常使用。请稍后或在其他网络重试：plannotator update\n` +
        `详情：${autoUpdatePaths(dataDir).log}\n`,
    );
    return 1;
  }
  if (code === UPDATE_PREPARE_FAILED) {
    const staging = stagingFailureIn(printed);
    if (staging) {
      // Downloaded, but the temp folder could not hold it: not a network problem.
      err(
        `无法准备更新：${staging}。${current} 仍已安装且可正常使用。\n` +
          `${updateStagingAdvice(staging)}，然后运行：plannotator update\n` +
          `或换用其他临时文件夹：\n  ${UPDATE_OTHER_TMPDIR_COMMAND}\n` +
          `详情：${autoUpdatePaths(dataDir).log}\n`,
      );
      return 1;
    }
    const tls = tlsFailureIn(printed);
    if (tls === "revoked") {
      // A blocked key: the network is the problem, and curl would trust it.
      err(
        `无法下载更新：连接出示的证书已被吊销。${current} 仍已安装且可正常使用。\n` +
          `不要在此网络上安装 Plannotator。请在其他网络重试：plannotator update\n` +
          `详情：${autoUpdatePaths(dataDir).log}\n`,
      );
      return 1;
    }
    // A failed download can be a lasting local condition (a proxy, a network
    // that inspects HTTPS), so the way out is always shown.
    const extraCa =
      "如果你的网络会用自有证书检查 HTTPS，请把 NODE_EXTRA_CA_CERTS 指向该证书：\n" +
      "  NODE_EXTRA_CA_CERTS=/path/to/its-root.pem plannotator update\n";
    if (tls === "untrusted" && platform === "darwin") {
      // macOS curl still trusts emSign G3: should a network that holds a
      // leaked key get "untrusted" instead of "revoked", the release page
      // (the browser's own trust) comes before the `curl | bash` line.
      err(
        `无法下载更新。${current} 仍已安装且可正常使用。请稍后重试：plannotator update\n` +
          extraCa +
          `如果问题持续，请从 ${releaseUrlFor(latest)} 下载\n` +
          `或自行安装：\n  ${command}\n` +
          `详情：${autoUpdatePaths(dataDir).log}\n`,
      );
      return 1;
    }
    err(
      `无法下载更新。${current} 仍已安装且可正常使用。请稍后重试：plannotator update\n` +
        `如果问题持续，请自行安装：\n  ${command}\n` +
        `或从 ${releaseUrlFor(latest)} 下载\n` +
        (tls === "untrusted" ? extraCa : "") +
        `详情：${autoUpdatePaths(dataDir).log}\n`,
    );
    return 1;
  }
  if (code !== 0) {
    err(
      `更新未安装：安装脚本以退出码 ${code} 结束。Plannotator 仍是 ${current}。\n` +
        `日志说明了出错原因：${autoUpdatePaths(dataDir).log}\n` +
        `也可以自行运行安装脚本：${command}\n`,
    );
    return 1;
  }
  out(`已更新到 ${latest}。更新内容：${releaseUrlFor(latest)}\n`);
  out(
    readInboxRegistry(dataDir)
      ? `已打开的审查仍在 ${current} 上运行。收件箱会显示「更新以重启到 ${latest}」。\n`
      : `已打开的审查仍在 ${current} 上运行；新的审查将从 ${latest} 开始。\n`,
  );
  if (begun.launch.flags.includes("skip-claude-plugin")) {
    out(`Claude Code 插件需单独更新：${CLAUDE_PLUGIN_UPDATE_COMMANDS.join(" && ")}\n`);
  }
  return 0;
}
