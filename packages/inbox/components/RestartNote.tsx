/**
 * Telling the person when a Claude Code session needs `/reload-plugins` after
 * an update (owner approval "restart-warning", 2026-10-19, simplified
 * 2026-10-21: the obvious path leads, alone), and the same for Pi (`/reload`),
 * Oh My Pi (`/restart`) and OpenCode 2 (`opencode2 reload`, or
 * `opencode2 plugin update <its spec>`, run in a shell, with one quiet line on
 * what a reload cancels; owner approval "reload-hosts", 2026-10-26). Pieces:
 *  - `ReloadLead`: one large sentence, "Type /reload-plugins in …", with a
 *    Copy that copies `/reload-plugins`. When the installed plugin is itself
 *    behind this Inbox, two steps instead: the update command with Copy, then
 *    `/reload-plugins`.
 *  - `Fold`: the manual path, folded by default behind one question.
 *  - `RestartLine`: under the person's reply when the session it goes to has
 *    no Send now because it runs an older plugin. The lead, then "Still no
 *    Send now after reloading?" opening `/exit` and the resume command.
 *  - `CopyCommand`: every Copy button. A copy says so in a polite live region.
 * No keyboard shortcut. Real buttons with names; the fold uses
 * aria-expanded / aria-controls.
 */

import { useId, useRef, useState, type ReactNode } from 'react';
import { copyTextToClipboard } from '@plannotator/ui/utils/clipboard';
import type { RestartNote } from '../deliveryLine';
import { Icon } from '../icons';

/** How long Copy reads "Copied". */
export const RESTART_COPIED_MS = 2000;
export const RESTART_COPIED_ANNOUNCEMENT = '已复制重启命令。';
export const UPDATE_COPIED_ANNOUNCEMENT = '已复制更新命令。';
export const RELOAD_COMMAND = '/reload-plugins';
export const RELOAD_COPIED_ANNOUNCEMENT = '已复制 /reload-plugins。';

/** Copy a command, with a short "Copied" and one polite announcement. */
export function CopyCommand({ text, label, short = '复制', announcement = RESTART_COPIED_ANNOUNCEMENT }: { text: string; label: string; short?: string; announcement?: string }) {
  const [copied, setCopied] = useState(false);
  const [said, setSaid] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <>
      <button
        type="button"
        className="ib-rw-copy"
        data-copied={copied ? '' : undefined}
        aria-label={label}
        data-restart-copy=""
        onClick={async () => {
          const ok = await copyTextToClipboard(text);
          setSaid('');
          // A fresh string each time, so a second copy is said again.
          setTimeout(() => setSaid(ok ? announcement : "无法复制命令。"), 30);
          if (!ok) return;
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), RESTART_COPIED_MS);
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} />
        <span>{copied ? '已复制' : short}</span>
      </button>
      <span className="ib-sr" role="status" aria-live="polite" data-restart-live="">
        {said}
      </span>
    </>
  );
}

/** A command on its own line, with Copy. */
export function CommandLine({ text, label, announcement }: { text: string; label: string; announcement?: string }) {
  return (
    <div className="ib-rw-cmd">
      <code>{text}</code>
      <CopyCommand text={text} label={label} {...(announcement ? { announcement } : {})} />
    </div>
  );
}

/** How a runtime loads new code: a command typed in the session, or run in a shell. */
export interface ReloadSpec {
  command: string;
  where: 'session' | 'shell';
}

/** Claude Code's: `/reload-plugins`, typed in the session. */
export const CLAUDE_RELOAD: ReloadSpec = { command: RELOAD_COMMAND, where: 'session' };

/** Copy the reload command (`/reload-plugins` by default). */
export function ReloadCopy({ command = RELOAD_COMMAND }: { command?: string } = {}) {
  return <CopyCommand text={command} label={`复制 ${command}`} announcement={`已复制 ${command}。`} />;
}

/**
 * The one thing to do, large and alone: "Type /reload-plugins {where}." with
 * Copy (Pi `/reload`, Oh My Pi `/restart`). With `updateCommand` (the
 * plugin on disk is itself behind this Inbox), two numbered steps: the update
 * command, then the reload. OpenCode 2 has its own one line (OpenCodeWords):
 * `opencode2 plugin update <spec>` loads the new plugin itself.
 */
export function ReloadLead({
  where,
  updateCommand,
  reload = CLAUDE_RELOAD,
  what = "Plannotator 的 Claude Code 插件",
}: {
  where: string;
  updateCommand?: string | null;
  reload?: ReloadSpec;
  /** What the update command updates, for its Copy's name. */
  what?: string;
}) {
  const verb = reload.where === 'shell' ? '运行' : '输入';
  const capital = verb;
  if (updateCommand) {
    return (
      <ol className="ib-rl-lead ib-rl-two" data-reload-lead="update_plugin">
        <li>
          <span>更新{reload === CLAUDE_RELOAD ? '插件' : what.replace(/^Plannotator 的 /, '')}：</span>
          <CommandLine text={updateCommand} label={`复制更新 ${what} 的命令`} announcement={UPDATE_COPIED_ANNOUNCEMENT} />
        </li>
        <li>
          <div className="ib-rl-line">
            <span>
              然后{verb} <code>{reload.command}</code> {where}。
            </span>
            <ReloadCopy command={reload.command} />
          </div>
        </li>
      </ol>
    );
  }
  return (
    <p className="ib-rl-lead ib-rl-line" data-reload-lead="restart" data-reload-command={reload.command}>
      <span>
        {capital} <code>{reload.command}</code> {where}。
      </span>
      <ReloadCopy command={reload.command} />
    </p>
  );
}

/** The reload a note names. */
export function reloadOf(note: RestartNote): ReloadSpec {
  return { command: note.reloadCommand, where: note.reloadWhere };
}

/** What a runtime's update command updates, for its Copy's name. */
export function updatedThing(runtime: RestartNote['runtime']): string {
  if (runtime === 'opencode') return "Plannotator 的 OpenCode 插件";
  if (runtime === 'pi' || runtime === 'oh-my-pi') return "Plannotator 的扩展";
  return "Plannotator 的 Claude Code 插件";
}

/** "in that Pi to get Send now", or for a shell command "to get Send now". */
function wherePhrase(note: RestartNote, name: string, purpose: string): string {
  return note.reloadWhere === 'shell' ? `，${purpose}` : `，在 ${name} 中${purpose}`;
}

/**
 * The manual path when the reload does not take, per runtime: Claude Code's
 * `/exit` and `claude --resume`; Pi quit and `pi --continue`; OpenCode 2's
 * `opencode2 service restart`. Oh My Pi's `/restart` already restarts it:
 * nothing more to fold.
 */
function ManualPath({ note, name }: { note: RestartNote; name: string }) {
  if (note.runtime === 'oh-my-pi') return null;
  if (note.runtime === 'opencode') {
    if (!note.fallbackCommand || openCodeCommand(note) !== 'opencode2 reload') return null;
    return (
      <Fold question="重新加载后仍没有「立即发送」？">
        <div data-restart-fallback="">
          重启 OpenCode 的后台服务：
          <CommandLine text={note.fallbackCommand} label="复制重启 OpenCode 后台服务的命令" />
          <p className="ib-rw-warn">这会中断 OpenCode 会话正在进行的任何回合。</p>
        </div>
        <p className="ib-rw-after">你的回复会在这里等待。</p>
      </Fold>
    );
  }
  if (note.runtime === 'pi') {
    return (
      <Fold question="重新加载后仍没有「立即发送」？">
        <div data-restart-fallback="">
          退出该 Pi（<code>/quit</code>），然后在它的文件夹中用 <code>pi --continue</code> 重新启动。
          <p className="ib-rw-warn">退出会中断它正在进行的回合。</p>
        </div>
        <p className="ib-rw-after">你的回复会在这里等待。</p>
      </Fold>
    );
  }
  return (
    <Fold question="重新加载后仍没有「立即发送」？">
      <div data-restart-fallback="">
        {note.command ? (
          <>
            在该 {name} 中输入 <code>/exit</code>，然后运行：
            <CommandLine text={note.command} label={`复制重启该 ${name} 会话的命令`} />
          </>
        ) : (
          <>
            在该 {name} 中输入 <code>/exit</code>，然后在其文件夹中运行 <code>claude --resume</code> 并选择该会话。
          </>
        )}
        <p className="ib-rw-warn">/exit 会中断它正在进行的回合。</p>
      </div>
      <p className="ib-rw-after">你的回复会在这里等待。</p>
    </Fold>
  );
}

/** OpenCode 2's one command: `opencode2 plugin update <spec>` when the plugin itself is behind, else `opencode2 reload` (after changing a pin). */
export function openCodeCommand(note: Pick<RestartNote, 'fix' | 'updateCommand' | 'reloadCommand' | 'pinnedSpec'>): string {
  return note.fix === 'update_extension' && note.updateCommand && !note.pinnedSpec ? note.updateCommand : note.reloadCommand;
}

/** `opencode2 reload` reloads every location of OpenCode's service: say, quietly, what it cancels. */
export const OPENCODE_RELOAD_WARNING = '会取消 OpenCode 当前显示的任何权限提示。';
export const OPENCODE_UPDATES_ALL = '它会更新所有有更新版本的 OpenCode 插件。';

/** The quiet lines under OpenCode's command: what a reload cancels; that an update with no target updates every plugin. */
export function OpenCodeQuiet({ command, updatesAll, className = 'ib-rw-after ib-rl-quiet' }: { command: string; updatesAll: boolean; className?: string }) {
  const reload = command === 'opencode2 reload';
  const all = updatesAll && !reload;
  if (!reload && !all) return null;
  return (
    <p className={className} data-opencode-quiet="">
      {reload ? OPENCODE_RELOAD_WARNING : OPENCODE_UPDATES_ALL}
    </p>
  );
}

/**
 * OpenCode 2's step as words: "Run <command>" (its Copy follows the line), or,
 * for a pinned spec, change it first: then the Copy sits right after the value
 * to write (`@plannotator/opencode@latest`), the first step's, and copies it.
 */
export function OpenCodeWords({ command, pinnedSpec, pinTo, tail = '' }: { command: string; pinnedSpec: string | null; pinTo: string | null; tail?: string }) {
  if (pinnedSpec) {
    const to = pinTo ?? '@plannotator/opencode@latest';
    return (
      <>
        OpenCode 的配置固定了 <code className="ib-rl-wrap">{pinnedSpec}</code>：请将其改为 <code className="ib-rl-wrap">{to}</code>{' '}
        <span className="ib-rl-inline-copy">
          <ReloadCopy command={to} />
        </span>{' '}
        然后运行 <code className="ib-rl-wrap">{command}</code>
        {tail}。
      </>
    );
  }
  return (
    <>
      运行 <code className="ib-rl-wrap">{command}</code>
      {tail}。
    </>
  );
}

/** The manual path, folded by default behind one question. */
export function Fold({ question, children }: { question: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="ib-rl-fold">
      <button type="button" className="ib-rw-lnk" aria-expanded={open} aria-controls={id} data-restart-toggle="" onClick={() => setOpen((was) => !was)}>
        <span>{question}</span>
        <Icon name="chevD" className="ib-rw-chev" />
      </button>
      <div className="ib-rw-steps" id={id} hidden={!open} data-restart-steps="">
        {children}
      </div>
    </div>
  );
}

/** Under the reply: what brings Send now back, then the manual path, folded. */
export function RestartLine({ note, name }: { note: RestartNote; name: string }) {
  const updating = note.fix === 'update_plugin' || note.fix === 'update_extension';
  if (note.runtime === 'opencode') {
    const command = openCodeCommand(note);
    return (
      <div className="ib-rw-note" data-restart-note={note.fix} data-restart-runtime={note.runtime}>
        <p className="ib-rl-lead ib-rl-line" data-reload-lead={note.pinnedSpec ? 'pin' : 'restart'} data-reload-command={command}>
          <span>
            <OpenCodeWords command={command} pinnedSpec={note.pinnedSpec} pinTo={note.pinTo} tail=" 以获得「立即发送」" />
          </span>
          {!note.pinnedSpec && <ReloadCopy command={command} />}
        </p>
        <OpenCodeQuiet command={command} updatesAll={note.updatesAll} />
        <ManualPath note={note} name={name} />
      </div>
    );
  }
  return (
    <div className="ib-rw-note" data-restart-note={note.fix} data-restart-runtime={note.runtime}>
      <ReloadLead
        where={wherePhrase(note, name, '以获得「立即发送」')}
        updateCommand={updating ? note.updateCommand : null}
        reload={reloadOf(note)}
        what={updatedThing(note.runtime)}
      />
      <ManualPath note={note} name={name} />
    </div>
  );
}

/**
 * In the grey "can't go in sooner" band under a reply that waits on a busy
 * session (approval "inbox-busy-agent-reply"): why it cannot go into the
 * running turn, and the fix with Copy. The session runs an older plugin
 * (`restart`): one sentence with `/reload-plugins`. The installed plugin is
 * itself behind this Inbox (`update_plugin`): the two steps. With no note
 * (no known fix): just that it cannot go in sooner. The manual path stays
 * folded, as under RestartLine.
 */
export function StuckReason({ note, name }: { note: RestartNote | null; name: string }) {
  if (!note) {
    return (
      <p className="ib-m-why" data-stuck-why="">
        它无法更早进入。
      </p>
    );
  }
  const updating = note.fix === 'update_plugin' || note.fix === 'update_extension';
  const what = note.runtime === 'pi' || note.runtime === 'oh-my-pi' ? '扩展' : '插件';
  const verb = note.reloadWhere === 'shell' ? '运行' : '输入';
  if (note.runtime === 'opencode') {
    // One command (an update reloads by itself), or a pin to change first.
    const command = openCodeCommand(note);
    return (
      <div className="ib-rw-note ib-m-whybox" data-restart-note={note.fix} data-restart-runtime={note.runtime}>
        <p className="ib-m-why" data-stuck-why="" data-reload-lead={note.pinnedSpec ? 'pin' : 'restart'} data-reload-command={command}>
          <span>
            它无法更早进入：此会话运行的是较旧的 Plannotator 插件。{' '}
            <OpenCodeWords command={command} pinnedSpec={note.pinnedSpec} pinTo={note.pinTo} tail={note.pinnedSpec ? '' : ' 以修复它'} />
          </span>
          {!note.pinnedSpec && <ReloadCopy command={command} />}
        </p>
        <OpenCodeQuiet command={command} updatesAll={note.updatesAll} />
        <ManualPath note={note} name={name} />
      </div>
    );
  }
  return (
    <div className="ib-rw-note ib-m-whybox" data-restart-note={note.fix} data-restart-runtime={note.runtime}>
      {updating ? (
        <>
          <p className="ib-m-why" data-stuck-why="">
            它无法更早进入：此会话运行的是较旧的 Plannotator {what}。
          </p>
          <ReloadLead where={wherePhrase(note, name, '以修复它')} updateCommand={note.updateCommand} reload={reloadOf(note)} what={updatedThing(note.runtime)} />
        </>
      ) : (
        <p className="ib-m-why" data-stuck-why="" data-reload-lead="restart" data-reload-command={note.reloadCommand}>
          <span>
            它无法更早进入：此会话运行的是较旧的 Plannotator {what}。{verb} <code>{note.reloadCommand}</code>{wherePhrase(note, name, '以修复它')}。
          </span>
          <ReloadCopy command={note.reloadCommand} />
        </p>
      )}
      <ManualPath note={note} name={name} />
    </div>
  );
}
