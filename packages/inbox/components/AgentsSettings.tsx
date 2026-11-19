import { Fragment, useEffect, useId, useState, type ReactNode } from 'react';
import {
  INBOX_AGENT_LABELS,
  inboxToolCostText,
  type InboxAgentId,
  type InboxAgentRow,
  type InboxAgentsModel,
  type InboxCodexAccount,
  type InboxHostSessions,
  type InboxOpenSession,
  type InboxToolHostId,
} from '@plannotator/core/inbox-types';
import { inboxApi, type InboxLaunchSettings } from '../api';
import { CURSOR_RULES_PLACE, noteCopiedByHand, noteWithoutMarkers } from '../agents';
import { HARNESSES, type ConnectContext } from '../harnesses';
import { HostMark, Icon } from '../icons';
import { ConnectPicker } from './ConnectPicker';
import { LaunchSettingsFile } from './LaunchSettingsFile';
import { T3AgentGroup } from './T3AgentGroup';
import { CommandLine, CopyCommand, Fold, OpenCodeQuiet, OpenCodeWords, openCodeCommand, ReloadCopy, ReloadLead, type ReloadSpec } from './RestartNote';
import type { InboxReloadRuntime } from '@plannotator/core/inbox-types';
import { clockTime, dayWords, formatCount } from '../format';
import { codexAccountLine } from '../codexAccount';
import { hostLabel } from '../compose/model';
import { launchStartIn } from '../data/actions/launchStartIn';

/** The agents New message starts, as Settings names them in "Start new agents in". */
const REX_LAUNCH_AGENTS = ['claude-code', 'pi', 'codex', 'opencode'];
/** "Claude Code and Pi", "Codex, OpenCode and Pi". */
const listWords = (names: readonly string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** Whether any host has an open session that needs a restart or an update: Settings' Agents dot. */
export function agentsNeedRestart(model: InboxAgentsModel | null | undefined): boolean {
  return Object.values(model?.sessions ?? {}).some((host) => (host?.outdated ?? 0) > 0);
}

/** "9:14 AM" today, "yesterday, 6:02 PM", "Oct 3, 6:02 PM". */
function sinceText(iso: string): string {
  const day = dayWords(iso);
  const time = clockTime(iso);
  return day === 'today' ? time : `${day}, ${time}`;
}

/** The head's state when sessions need something: "Connected · 2 need a reload". */
function sessionsState(id: InboxToolHostId, sessions: InboxHostSessions | undefined): string | null {
  if (!sessions || sessions.outdated === 0) return null;
  const n = sessions.outdated;
  if (id === 'pi') return n === 1 ? '1 needs a reload' : `${n} need a reload`;
  if (sessions.sessions.some((s) => s.outdated?.fix === 'update_plugin' || (id === 'opencode' && s.outdated?.fix === 'update_extension'))) return 'plugin needs an update';
  return n === 1 ? '1 needs a reload' : `${n} need a reload`;
}

/**
 * Settings → Agents' "Open sessions" row. For Claude Code sessions on an older
 * plugin (simplified 2026-10-21, owner: "simple buttons win"): one large line,
 * "Type /reload-plugins in each of these N Claude Code sessions." with Copy;
 * then the sessions as a short list; the manual path (/exit and a restart
 * command per session) folded behind "Still listed after reloading?".
 */
function OpenSessions({ id, sessions }: { id: InboxToolHostId; sessions: InboxHostSessions }) {
  const stale = sessions.sessions.filter((s) => s.outdated);
  const versions = [...new Set(stale.map((s) => s.plugin))];
  const what = id === 'pi' ? 'extension' : 'plugin';
  // OpenCode reports its plugin since "reload-hosts"; an older OpenCode connection says nothing.
  const reports = id !== 'opencode' || sessions.sessions.some((s) => s.plugin);
  const older =
    stale.length === 0
      ? reports
        ? ' · up to date'
        : ''
      : versions.length === 1 && versions[0]
        ? ` · ${stale.length} on ${what} ${versions[0]}`
        : ` · ${stale.length} on an older ${what}`;
  const runningOnly = id !== 'claude-code' && stale.length === 0 && sessions.sessions[0]?.plugin ? ` · ${what} ${sessions.sessions[0].plugin}` : '';
  // Pi, Oh My Pi and OpenCode 2 sessions whose connection says which command loads the new code.
  const reloadable = stale.filter((s) => s.outdated?.runtime && s.outdated.runtime !== 'claude-code');
  // Pi sessions on a connection older than the on-disk report: the update line, for them alone (beside any reloadable ones).
  const legacy = id === 'pi' ? stale.filter((s) => !s.outdated?.runtime) : [];
  let sub: ReactNode = null;
  if (legacy.length > 0) {
    const first = legacy[0]!;
    sub = (
      <>
        Run <code>pi update --extensions</code>, then <code>/reload</code> in {legacy.length === 1 ? '该会话' : `这 ${legacy.length} 个会话中的每一个`}
        {legacy.length === 1 ? `（${first.project ?? 'Pi'}，自 ${sinceText(first.started_at)} 起）` : ''}。
      </>
    );
  }
  const reload = id === 'claude-code' && stale.length > 0;
  const updating = stale.some((s) => s.outdated?.fix === 'update_plugin');
  return (
    <div className="ib-agrow" data-agent-sessions={id}>
      <span className="ib-agk">打开的会话</span>
      <span className="ib-agv">
        {formatCount(sessions.running)} 个运行中
        {older}
        {runningOnly}
      </span>
      <span className="ib-agr" />
      {sub && (
        <span className="ib-agsub ib-agwarn">
          <Icon name="refresh" />
          <span>{sub}</span>
        </span>
      )}
      {reloadable.length > 0 && <HostReload sessions={reloadable} />}
      {reload && (
        <div className="ib-rl" data-reload-sessions="">
          <ReloadLead
            where={stale.length === 1 ? '在此 Claude Code 会话中' : `在这 ${stale.length} 个 Claude Code 会话中的每一个`}
            updateCommand={updating ? (sessions.update_command ?? null) : null}
          />
          <ul className="ib-rw-sess" aria-label="使用旧版插件的 Claude Code 会话">
            {stale.map((s) => (
              <li key={s.session}>
                <SessionRow session={s} />
              </li>
            ))}
          </ul>
          <Fold question="重新加载后仍列出？">
            <p className="ib-rl-manual" data-restart-fallback="">
              Type <code>/exit</code> in any session still listed, then run its restart command. <span className="ib-rw-warn">/exit 会中止它正在进行的轮次。</span>
            </p>
            <ul className="ib-rw-sess" aria-label="重启命令">
              {stale.map((s) => (
                <li key={s.session}>
                  <SessionRow session={s} restart />
                </li>
              ))}
            </ul>
          </Fold>
        </div>
      )}
    </div>
  );
}

const RUNTIME_LABEL: Record<InboxReloadRuntime, string> = { 'claude-code': 'Claude Code', pi: 'Pi', 'oh-my-pi': 'Oh My Pi', opencode: 'OpenCode' };

/**
 * Pi, Oh My Pi and OpenCode 2 sessions on older code (owner approval
 * "reload-hosts"): per runtime and command, one large line with Copy
 * ("Type /reload in each of these 2 Pi sessions.", "Type /restart in this Oh
 * My Pi session.", "Run opencode2 reload."), the update first when the
 * package on disk is behind too (OpenCode 2: `opencode2 plugin update <its
 * spec>` alone, or the pin to change), then the sessions as a short list.
 * OpenCode's reload carries one quiet line on what it cancels; its server
 * restart is folded.
 */
function HostReload({ sessions }: { sessions: InboxOpenSession[] }) {
  const groups = new Map<string, InboxOpenSession[]>();
  for (const s of sessions) {
    const o = s.outdated!;
    const key = `${o.runtime}|${o.reload_command ?? ''}|${o.fix === 'update_extension' ? (o.update_command ?? '') : ''}|${o.pinned_spec ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return (
    <>
      {[...groups.entries()].map(([key, group]) => {
        const o = group[0]!.outdated!;
        const runtime = o.runtime!;
        const name = RUNTIME_LABEL[runtime];
        const reload: ReloadSpec = { command: o.reload_command ?? '/reload', where: o.reload_where ?? 'session' };
        const n = group.length;
        const where = n === 1 ? `在此 ${name} 会话中` : `在这 ${n} 个 ${name} 会话中的每一个`;
        const what = 'Plannotator 的扩展';
        // OpenCode 2: one short line with its command and Copy (an update reloads by itself), the pin first when there is one.
        const command =
          runtime === 'opencode'
            ? openCodeCommand({ fix: o.fix, updateCommand: o.update_command ?? null, reloadCommand: o.reload_command ?? 'opencode2 reload', pinnedSpec: o.pinned_spec ?? null })
            : null;
        return (
          <div className="ib-rl" data-reload-sessions={runtime} key={key}>
            {command ? (
              <>
                <p className="ib-rl-lead ib-rl-line" data-reload-lead={o.pinned_spec ? 'pin' : 'restart'} data-reload-command={command}>
                  <span>
                    <OpenCodeWords command={command} pinnedSpec={o.pinned_spec ?? null} pinTo={o.pin_to ?? null} />
                  </span>
                  {!o.pinned_spec && <ReloadCopy command={command} />}
                </p>
                <OpenCodeQuiet command={command} updatesAll={o.update_scope === 'all'} className="ib-rl-quiet" />
              </>
            ) : (
              <ReloadLead where={where} updateCommand={o.fix === 'update_extension' ? (o.update_command ?? null) : null} reload={reload} what={what} />
            )}
            <ul className="ib-rw-sess" aria-label={`使用旧版代码的 ${name} 会话`}>
              {group.map((s) => (
                <li key={s.session}>
                  <SessionRow session={s} />
                </li>
              ))}
            </ul>
            {command === 'opencode2 reload' && o.fallback_command && (
              <Fold question="重新加载后仍列出？">
                <div className="ib-rl-manual" data-restart-fallback="">
                  重启 OpenCode 的后台服务：
                  <CommandLine text={o.fallback_command} label="复制重启 OpenCode 后台服务的命令" />
                  <span className="ib-rw-warn">这会中止 OpenCode 会话正在进行的任何轮次。</span>
                </div>
              </Fold>
            )}
          </div>
        );
      })}
    </>
  );
}

/** One session: its project, since when, idle or working. With `restart`, its Copy restart. */
function SessionRow({ session, restart }: { session: InboxOpenSession; restart?: boolean }) {
  const state = session.busy === true ? 'working' : session.busy === false ? 'idle' : null;
  const meta = [`自 ${sinceText(session.started_at)} 起`, state].filter(Boolean).join(' · ');
  return (
    <div className="ib-rw-srow" {...(restart ? { 'data-session-restart': session.session } : { 'data-session-row': session.session })}>
      <span className="ib-rw-sw">
        <span className="ib-rw-sp" title={session.folder ?? undefined}>
          {session.project ?? '一个会话'}
        </span>
        <span className="ib-rw-sm">{meta}</span>
      </span>
      {restart &&
        (session.restart_command ? (
          <CopyCommand text={session.restart_command} short="复制重启命令" label={`复制重启命令：用于重启 ${session.project ?? 'Claude Code'} 会话（启动于 ${sinceText(session.started_at)}）的命令`} />
        ) : (
          <span className="ib-rw-sm">
            在其文件夹中运行 <code>claude --resume</code>
          </span>
        ))}
    </div>
  );
}

type Change = { reach?: boolean; tool?: boolean; reminder?: boolean; note?: boolean };

function Switch({ on, label, disabled, busy, onClick }: { on: boolean; label: string; disabled?: boolean; busy?: boolean; onClick: () => void }) {
  // While a change to this agent is saving, a second click is ignored (aria-busy), never queued.
  return (
    <button
      type="button"
      role="switch"
      className="ib-sw"
      aria-checked={on}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => !busy && onClick()}
    />
  );
}

/** How an agent reaches the Inbox, beside its name. */
function viaOf(row: InboxAgentRow): string {
  if (row.reach.kind === 'tool') return row.id === 'pi' ? 'Plannotator 的扩展' : 'Plannotator 的插件';
  if (row.reach.kind === 'mcp') return 'MCP 服务器';
  return '由你自行连接';
}

/** Words a group's head and its "Your replies" row share with the T3 Code group (T3AgentGroup.tsx). */
export const agentWords = {
  connected: '已连接',
  notConnected: '未连接',
  replies: '你的回复',
  repliesWake: '作为新轮次送达',
  repliesCheck: '在它检查收件箱时看到；无法唤醒',
} as const;

function stateOf(row: InboxAgentRow): { text: string; tone: 'on' | 'off' | 'bad' } {
  switch (row.reach.state) {
    case 'connected':
      return { text: agentWords.connected, tone: 'on' };
    case 'removed':
      return { text: '在 Plannotator 之外被移除', tone: 'bad' };
    case 'elsewhere':
      return { text: '已在另一个文件夹中连接', tone: 'off' };
    case 'foreign':
      return { text: '已有自己的条目', tone: 'bad' };
    case 'unreadable':
      return { text: '无法读取其配置', tone: 'bad' };
    case 'manual':
      return { text: '请自行连接', tone: 'off' };
    case 'not_connected':
      return { text: agentWords.notConnected, tone: 'off' };
    default:
      return { text: '关闭', tone: 'off' };
  }
}

/**
 * What happens to the person's reply, for an agent that reaches the Inbox:
 * Plannotator's own connection puts it into the session as a new turn; an
 * agent reached through MCP (or OpenCode 1, which has the tool but no wake)
 * reads it when it next checks. Null when the agent does not reach the Inbox,
 * or when it is not known.
 */
export function repliesOf(row: InboxAgentRow): { text: string; wakes: boolean } | null {
  if (!row.reach.on) return null;
  if (row.reach.kind === 'tool') {
    if (row.tool?.mod_off) return null;
    if (row.id === 'opencode' && row.plugin?.generation === '1') return { text: '在它检查收件箱时看到；OpenCode 1 无法被唤醒', wakes: false };
    return { text: agentWords.repliesWake, wakes: true };
  }
  // Codex: the Inbox wakes it itself (`codex queue`) when it found a Codex that can (the server's `wakes`).
  if (row.reach.kind === 'mcp' && row.wakes === true) return { text: agentWords.repliesWake, wakes: true };
  if (row.reach.kind === 'mcp') return { text: agentWords.repliesCheck, wakes: false };
  return null;
}

/** Agents whose instructions live in their own settings, not a file. */
const NO_NOTE_FILE: Partial<Record<InboxAgentId, string>> = {
  kiro: 'Kiro CLI 没有全局指令文件，因此没有可添加备注的文件。',
  muse: 'Muse Code 的用户规则文件没有公开的位置，因此没有可添加备注的文件。',
};

/**
 * What a switch left off means for that agent, one quiet line under its row
 * while it is off (owner, 2026-11-07: "If they turn off the Inbox tool, then
 * it's game over. … Let 'em know. Even reminders."). No dialog, no confirm.
 * Only under an agent found on this computer (owner, 2026-11-09): an agent the
 * page marks "Not found on this computer" gets none.
 */
export const offWords = {
  reach: (label: string) => `关闭：${label} 无法在此向你发送消息或读取你的回复。`,
  /** The Inbox tool off while its MCP server still reaches the Inbox (Claude Code or Pi connected through MCP). */
  toolBesideMcp: (label: string) => `关闭：${label} 仅通过上方的 MCP 服务器联系你。`,
  reminder: (label: string) => `关闭：会话启动时不会告知 ${label} 收件箱的存在，因此它很少使用。`,
  note: (label: string) => `关闭：不会告知 ${label} 何时向你发送决策和已完成的工作。`,
};

type OffKind = 'reach' | 'tool' | 'reminder' | 'note';

export function Row({
  k,
  v,
  r,
  sub,
  warn,
  na,
  off,
  data,
}: {
  k: string;
  v: ReactNode;
  r?: ReactNode;
  sub?: ReactNode;
  warn?: boolean;
  na?: boolean;
  /** The off line: what this switch being off means, shown only while it is off. */
  off?: { kind: OffKind; text: string } | null;
  data?: Record<`data-${string}`, string>;
}) {
  return (
    <div className={`ib-agrow${na ? ' ib-agna' : ''}`} {...data}>
      <span className="ib-agk">{k}</span>
      <span className="ib-agv">{v}</span>
      <span className="ib-agr">{r}</span>
      {off && (
        <span className="ib-agsub" data-agent-off={off.kind}>
          <Icon name="info" />
          <span>{off.text}</span>
        </span>
      )}
      {sub && (
        <span className={`ib-agsub${warn ? ' ib-agwarn' : ''}`}>
          <Icon name={warn ? 'warn' : 'info'} />
          <span>{sub}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Codex's account, read-only (`GET /api/inbox/codex/account`, asked once when the row shows): the plan or API key and
 * how much of its limits is used, or that Codex is not signed in and the command that signs in. Plannotator never
 * signs in for the person. No row until the read answers, nor when it could not be read.
 */
function CodexAccountRow() {
  const [account, setAccount] = useState<InboxCodexAccount | null>(null);
  useEffect(() => {
    let live = true;
    inboxApi
      .codexAccount()
      .then((read) => live && setAccount(read.account))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const line = codexAccountLine(account);
  if (!line) return null;
  return (
    <Row
      k="账户"
      v={line.value}
      sub={
        line.signIn ? (
          <>
            在终端中运行 <code>codex login</code> 以登录。
          </>
        ) : (
          line.limits
        )
      }
      data={{ 'data-codex-account': account?.state === 'signed_in' ? account.kind : 'signed_out' }}
    />
  );
}

function AgentGroup({
  row,
  noteText,
  onChange,
  pending,
  busy,
  sessions,
  extra,
  settling,
}: {
  row: InboxAgentRow;
  /** A run is still connecting the agents (`model.connecting`): the switches may still turn on, so no off line yet. */
  settling?: boolean;
  /** Rows after its own (Claude Code: "Start new sessions with full permissions", launch only). */
  extra?: ReactNode;
  noteText: string;
  onChange: (change: Change) => void;
  pending: Set<string>;
  busy: boolean;
  /** Its open sessions that poll the Inbox now (Claude Code, Pi, OpenCode). */
  sessions?: InboxHostSessions;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  const base = row.detected ? stateOf(row) : { text: '此电脑上未找到', tone: 'off' as const };
  const needs = row.id === 'claude-code' || row.id === 'pi' || row.id === 'opencode' ? sessionsState(row.id, sessions) : null;
  const state = needs ? { text: `${base.text} · ${needs}`, tone: 'bad' as const } : base;
  // An off line shows only under an agent found on this computer (the header's status is not "Not found on this
  // computer"), and only once that is known and settled: never in, then out.
  const offLine = (kind: OffKind, text: string) => (row.detected === true && !settling ? { kind, text } : null);
  // DeepSeek Harness decides once, when it starts (its plugin), never per session.
  const next = row.id === 'dsh' ? '在 DeepSeek Harness 下次启动时' : row.id === 'openclaw' ? 'OpenClaw 的下一条消息' : `${row.label} 的下次会话`;
  const reach = row.reach;
  const reachValue =
    reach.kind === 'tool' ? (
      <>
        the <code>plannotator_inbox</code> tool
      </>
    ) : reach.kind === 'mcp' ? (
      reach.state === 'elsewhere' ? (
        <span data-reach-elsewhere="">
          已在 <code>{reach.path}</code> 中连接。开启即可将其移到这里。
        </span>
      ) : reach.state === 'removed' ? (
        <>
          <code>plannotator-inbox</code> 已不在 <code>{reach.path}</code> 中。Plannotator 不会自行将其加回；开启此项即可添加。
        </>
      ) : reach.state === 'foreign' ? (
        <>
          <code>{reach.path}</code> 已有自己的 <code>plannotator-inbox</code> 条目，因此 Plannotator 不会改动它。
        </>
      ) : reach.state === 'unreadable' ? (
        <>
          <code>{reach.path}</code> 无法读取（{reach.reason}），因此 Plannotator 不会改动它。
        </>
      ) : (
        <>
          <code>plannotator-inbox</code>
          {reach.path ? (
            <>
              {' '}
              in <code>{reach.path}</code>
            </>
          ) : null}
        </>
      )
    ) : (
      '请自行添加：下方「此电脑上未找到」处有其命令。'
    );
  // Pi and OpenCode send the tool whole with every request (Claude Code defers it behind tool search): the measured cost.
  const cost = row.id === 'pi' || row.id === 'opencode' ? `会把该工具添加到每次 ${row.label} 请求中：${inboxToolCostText(row.id)}。` : null;
  // Claude Code's mod off: its plugin gives no tool, so there is nothing to switch (the reason shows instead).
  const modOff = row.tool?.mod_off === true;
  // Claude Code's MCP entry is one the person added by hand (`claude mcp add`): Plannotator never writes or removes it.
  const handMcp = row.id === 'claude-code' && reach.kind === 'mcp';
  const replies = repliesOf(row);
  const reachSwitchable = (reach.kind === 'tool' || reach.kind === 'mcp') && reach.state !== 'foreign' && reach.state !== 'unreadable' && !modOff && !handMcp;
  const note = row.note;
  const noteOn = note?.state === 'added' || note?.state === 'edited';
  const noteState = note
    ? note.state === 'added' || note.state === 'edited'
      ? note.created
        ? '由 Plannotator 创建'
        : '已标记的段落'
      : note.state === 'absent'
        ? note.create
          ? '将会创建'
          : '尚无备注'
        : note.state === 'manual'
          ? '请自行复制'
          : note.state === 'unavailable'
          ? '尚无文件'
          : ''
    : '';
  const noteSub =
    noteOn && note?.reason
      ? note.reason
      : note?.state === 'edited'
      ? "你编辑过此备注，因此 Plannotator 不会更新它。关闭后，它会按你留下的样子被移除。"
      : note?.state === 'manual' || note?.state === 'unavailable' || note?.state === 'damaged' || note?.state === 'refused'
        ? note.reason
        : note?.shared_with && note.shared_with.length > 0
          ? `此文件与 ${note.shared_with.map((id) => INBOX_AGENT_LABELS[id]).join('、')} 共享：只有一个段落，任一方开启期间都会保留。`
          : note?.target
            ? `此文件是指向 ${note.target} 的链接；备注会写入那里。`
            : null;

  return (
    <div className="ib-agent" data-agent={row.id}>
      <div className="ib-aghead">
        <HostMark host={row.id} big />
        <b>{row.label}</b>
        <span className="ib-agvia">{viaOf(row)}</span>
        <span className={`ib-agstate${state.tone === 'off' ? ' ib-agoff' : state.tone === 'bad' ? ' ib-agbad' : ''}`}>
          <span className="ib-agdot" />
          {state.text}
        </span>
      </div>
      <Row
        k="联系收件箱"
        v={reachValue}
        // Connected under another QWEN_HOME still reaches the Inbox from there: its value says where, so no off line.
        off={reachSwitchable && !reach.on && reach.state !== 'elsewhere' ? offLine('reach', offWords.reach(row.label)) : null}
        sub={modOff && reach.kind === 'tool' ? reach.reason : reach.kind === 'tool' ? cost : null}
        warn={modOff && reach.kind === 'tool'}
        r={
          reachSwitchable ? (
            <>
              {pending.has(`${row.id}:reach`) && <span className="ib-agpending">{next}</span>}
              <Switch on={reach.on} label={`联系收件箱：${row.label}`} disabled={reach.locked} busy={busy} onClick={() => onChange({ reach: !reach.on })} />
            </>
          ) : null
        }
      />
      {replies && <Row k={agentWords.replies} v={replies.text} data={{ 'data-agent-replies': replies.wakes ? 'wake' : 'check' }} />}
      {row.tool && reach.kind !== 'tool' && (
        <Row
          k="The Inbox tool"
          sub={cost}
          off={row.tool.on ? null : offLine('tool', reach.on ? offWords.toolBesideMcp(row.label) : offWords.reach(row.label))}
          v={
            <>
              the <code>plannotator_inbox</code> tool, with Plannotator&apos;s {row.id === 'pi' ? 'extension' : 'plugin'}
            </>
          }
          r={
            <>
              {pending.has(`${row.id}:tool`) && <span className="ib-agpending">{next}</span>}
              <Switch on={row.tool.on} label={`The Inbox tool: ${row.label}`} disabled={row.tool.locked || modOff} busy={busy} onClick={() => onChange({ tool: !row.tool!.on })} />
            </>
          }
        />
      )}
      {row.reminder && (
        <Row
          k="Reminder at session start"
          v={row.reminder.needs_tool ? 'Needs the tool' : 'one line when a session starts'}
          // "Needs the tool" already says why; the tool's own off line says what that means.
          off={!row.reminder.on && !row.reminder.needs_tool ? offLine('reminder', offWords.reminder(row.label)) : null}
          r={
            <>
              {pending.has(`${row.id}:reminder`) && <span className="ib-agpending">{next}</span>}
              <Switch
                on={row.reminder.on}
                label={`Reminder at session start: ${row.label}`}
                disabled={row.reminder.locked || row.reminder.needs_tool}
                busy={busy}
                onClick={() => onChange({ reminder: !row.reminder!.on })}
              />
            </>
          }
        />
      )}
      {note ? (
        <>
          <Row
            k="指令中的备注"
            v={
              <>
                {note.path ? <code>{note.path}</code> : noteCopiedByHand(row) ? `${CURSOR_RULES_PLACE} in ${row.label}` : null}
                {noteState && <> · {noteState}</>}
                <button type="button" className="ib-lnk" aria-expanded={show} aria-controls={`${id}-note`} onClick={() => setShow((open) => !open)}>
                  {show ? '隐藏' : noteCopiedByHand(row) ? '显示备注' : '显示'}
                </button>
              </>
            }
            r={
              note.state === 'absent' || note.state === 'added' || note.state === 'edited' ? (
                <>
                  {pending.has(`${row.id}:note`) && <span className="ib-agpending">{next}</span>}
                  <Switch on={noteOn} label={`指令中的备注：${row.label}`} busy={busy} onClick={() => onChange({ note: !noteOn })} />
                </>
              ) : null
            }
            off={note.state === 'absent' ? offLine('note', offWords.note(row.label)) : null}
            sub={noteSub}
            warn={(note.state === 'unavailable' || note.state === 'damaged' || note.state === 'refused') && noteSub !== null}
          />
          {show && (
            <div className="ib-agrow ib-agnote" id={`${id}-note`}>
              <span />
              <div className="ib-cbox">
                {noteCopiedByHand(row) && (
                  <p>
                    将此文本复制到 {row.label} 的 {CURSOR_RULES_PLACE} 中。Plannotator 无法查看、更新或删除该副本。
                  </p>
                )}
                <pre>{noteCopiedByHand(row) ? noteWithoutMarkers(noteText) : noteText}</pre>
              </div>
            </div>
          )}
        </>
      ) : NO_NOTE_FILE[row.id] ? (
        <Row k="指令中的备注" v={NO_NOTE_FILE[row.id]} na />
      ) : null}
      {extra}
      {sessions && sessions.running > 0 && (row.id === 'claude-code' || row.id === 'pi' || row.id === 'opencode') && (
        <OpenSessions id={row.id} sessions={sessions} />
      )}
    </div>
  );
}

/**
 * Settings → Agents (the approved "inbox-agent-awareness" design, 08-09):
 * one group per agent found on this computer with up to three switches,
 * Reaches the Inbox, Reminder at session start (Claude Code, Pi, OpenCode)
 * and Note in its instructions; the agents not found folded behind the
 * harness picker. Every change applies to that agent's next session.
 */
export function AgentsSettings({
  model,
  onModel,
  context,
  launch,
}: {
  model: InboxAgentsModel;
  onModel: (next: InboxAgentsModel) => void;
  context: ConnectContext | null;
  /** Starting agents from New message (`SettingsModel.launch`): its switch, and while on the launch rows. Absent: no launch rows. */
  launch?: InboxLaunchSettings | null;
}) {
  const [launchState, setLaunchState] = useState(launch ?? null);
  const [launchBusy, setLaunchBusy] = useState(false);
  // `rex_here` comes only from this pane's own read (the window's settings model never asks Rex): kept across the model's changes.
  useEffect(() => setLaunchState((was) => (launch ? { ...launch, rex_here: was?.rex_here } : null)), [launch?.enabled, launch?.full_permissions, launch?.follows, launch?.needs_consent, launch?.bypass_off, launch?.own_mode, launch?.scratch_dir, launch?.settings_file]);
  // Shown: the switches as they stand now (full permissions never set: it follows the login shell, read again here).
  useEffect(() => {
    if (!launch) return;
    let live = true;
    inboxApi
      .launchSettingsRead()
      .then((read) => live && setLaunchState(read.launch))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [launch?.enabled]);
  /** A save's answer: it never asks Rex (`rex_here` absent), so the pane keeps what its own read said. */
  const takeLaunch = (next: InboxLaunchSettings) => setLaunchState((was) => ({ ...next, rex_here: next.rex_here ?? was?.rex_here }));
  // "Start agents from New message": config.json `inboxLaunch.enabled`, read live (New message's New session rows follow).
  const toggleEnabled = async () => {
    if (!launchState || launchBusy) return;
    setLaunchBusy(true);
    setError(null);
    try {
      const next = (await inboxApi.launchEnabled(!launchState.enabled)).launch;
      takeLaunch(next);
      // Turned on: the full-permissions row as a launch would start now (the login shell, read once it was on).
      if (next.enabled) {
        void inboxApi
          .launchSettingsRead()
          .then((read) => setLaunchState((was) => (was?.enabled ? read.launch : was)))
          .catch(() => {});
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLaunchBusy(false);
    }
  };
  // "Start new agents in" (`inboxLaunch.startIn`): in the background, or Rex. Rex is offered while its app is
  // attached on this computer, or while it is the choice (so it can be turned back); the agents that can't run in Rex say so.
  const pickStartIn = async (next: 'inbox' | 'rex') => {
    if (!launchState || launchBusy || launchState.start_in === next) return;
    setLaunchBusy(true);
    setError(null);
    try {
      takeLaunch((await launchStartIn(next)).launch);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLaunchBusy(false);
    }
  };
  const inRex = launchState?.start_in === 'rex';
  const rexNames = (launchState?.rex_agents ?? []).map(hostLabel);
  const notRexNames = REX_LAUNCH_AGENTS.filter((id) => !(launchState?.rex_agents ?? []).includes(id)).map(hostLabel);
  const startInRow =
    launchState?.enabled && rexNames.length > 0 && (launchState.rex_here || inRex) ? (
      <Row
        k="在何处启动新智能体"
        v={
          <span className="ib-seg" role="group" aria-label="在何处启动新智能体">
            {(['inbox', 'rex'] as const).map((where) => (
              <button key={where} type="button" className="ib-seg-o" aria-pressed={(launchState.start_in ?? 'inbox') === where} data-on={(launchState.start_in ?? 'inbox') === where ? '' : undefined} disabled={launchBusy} onClick={() => void pickStartIn(where)} data-launch-start-in={where}>
                {where === 'inbox' ? '后台运行' : 'Rex'}
              </button>
            ))}
          </span>
        }
        sub={
          <>
            在 Rex 中，每个新智能体都在其项目的 Rex 会话的独立标签页中运行，收件箱关闭后仍在其中继续运行。{listWords(rexNames)} 可以在 Rex 中启动
            {notRexNames.length > 0 ? `；${listWords(notRexNames)}始终在后台启动。` : '。'}
            {inRex && launchState.rex_here === false && (
              <span className="block" data-launch-rex-away="">
                此电脑上尚未打开 Rex，因此新智能体会先在后台启动，直到 Rex 打开。
              </span>
            )}
          </>
        }
        data={{ 'data-launch-start-in-row': launchState.start_in ?? 'inbox' }}
      />
    ) : null;
  // Windows (`unsupported`): no switch; launch there is config.json only.
  const enabledRow = launchState && !launchState.unsupported ? (
    <div className="ib-agent ib-aglaunch" data-launch-enabled-group="">
      <Row
        k="从新消息启动智能体"
        v="Claude Code、Codex、OpenCode 和 Pi"
        sub="新消息可以在你选择的文件夹中启动 Claude Code、Codex、OpenCode 或 Pi。关闭后只能向已在运行的会话发送消息。"
        data={{ 'data-launch-enabled-row': launchState.enabled ? 'on' : 'off' }}
        r={<Switch on={launchState.enabled} label="从新消息启动智能体" busy={launchBusy} onClick={() => void toggleEnabled()} />}
      />
      {startInRow}
    </div>
  ) : null;
  const toggleFull = async () => {
    if (!launchState || launchBusy) return;
    setLaunchBusy(true);
    setError(null);
    try {
      takeLaunch((await inboxApi.launchSettings(!launchState.full_permissions)).launch);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLaunchBusy(false);
    }
  };
  const launchRow = launchState?.enabled ? (
    <Row
      k="你启动的会话"
      v={launchState.full_permissions && !launchState.needs_consent && !launchState.bypass_off ? '完全权限' : launchState.own_mode ? '你的默认模式' : '自动模式'}
      sub={
        <>
          以完全权限启动新会话：你从新消息启动的 Claude Code 会直接运行，不再询问（绕过模式）；只有安全检查，例如删除文件，仍会在这里询问你。否则会以你的默认模式或自动模式启动。应用于你下次启动的会话。
          {launchState.follows && (
            <span className="block" data-launch-follows={launchState.follows}>
              {launchState.follows === 'shell' ? '在你更改之前，使用你的 shell 设置。' : '在你更改之前，使用你的 Claude Code 设置。'}
            </span>
          )}
          {launchState.full_permissions && launchState.bypass_off && (
            <span className="block" data-launch-bypass-off="">
              你的 Claude Code 设置中已关闭绕过模式，因此会话会在不启用它的情况下启动。
            </span>
          )}
          {launchState.full_permissions && launchState.needs_consent && (
            <span className="block" data-launch-needs-consent="">
              请在终端中接受一次 Claude Code 的绕过提示后才能使用此功能。在此之前，会话会在不启用它的情况下启动。
            </span>
          )}
        </>
      }
      data={{ 'data-launch-full-row': '' }}
      r={<Switch on={launchState.full_permissions} label="以完全权限启动新会话" busy={launchBusy} onClick={() => void toggleFull()} />}
    />
  ) : null;
  // "Scratch folders": where New message's "New scratch folder" makes each one (`inboxLaunch.scratchDir`).
  const [scratchEdit, setScratchEdit] = useState<string | null>(null);
  const saveScratch = async () => {
    if (scratchEdit === null || launchBusy) return;
    setLaunchBusy(true);
    setError(null);
    try {
      takeLaunch((await inboxApi.launchScratchDir(scratchEdit.trim() || null)).launch);
      setScratchEdit(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLaunchBusy(false);
    }
  };
  const scratchRow =
    launchState?.enabled && launchState.scratch_dir_shown !== undefined ? (
      <Row
        k="临时文件夹"
        v={
          scratchEdit === null ? (
            <code data-launch-scratch-dir="">{launchState.scratch_dir_shown}</code>
          ) : (
            <input
              className="ib-agpath"
              type="text"
              aria-label="临时文件夹"
              placeholder="留空：使用默认位置"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              value={scratchEdit}
              readOnly={launchBusy}
              data-launch-scratch-input=""
              onChange={(event) => setScratchEdit(event.target.value)}
              // Enter does not save (no new keys in the Inbox): only the Save button does.
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
              }}
            />
          )
        }
        sub={
          <>
            新的临时文件夹会创建在这里，名称取自其话题。更改仅应用于新文件夹。请选择任意 git
            仓库之外的文件夹。
          </>
        }
        data={{ 'data-launch-scratch-row': '' }}
        r={
          scratchEdit === null ? (
            <button type="button" className="ib-btn ib-sm" data-launch-scratch-change="" onClick={() => setScratchEdit(launchState.scratch_dir_shown ?? '')}>
              更改
            </button>
          ) : (
            <>
              <button type="button" className="ib-btn ib-sm ib-ghost" onClick={() => setScratchEdit(null)}>
                取消
              </button>
              <button type="button" className="ib-btn ib-sm ib-pri" disabled={launchBusy} data-launch-scratch-save="" onClick={() => void saveScratch()}>
                保存
              </button>
            </>
          )
        }
      />
    ) : null;
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  // The three Plannotator hosts stay listed (their Inbox tool switch) even when not found on this computer.
  const shown = model.agents.filter((row) => row.detected || row.tool);
  const detected = model.agents.filter((row) => row.detected);
  const undetected = model.agents.filter((row) => !row.detected && !row.tool);
  // T3 Code runs Claude and Codex threads: its group follows theirs.
  const t3After = (shown.find((row) => row.id === 'codex') ?? shown.find((row) => row.id === 'claude-code'))?.id;

  const change = async (agent: InboxAgentId, input: Change) => {
    if (busy.has(agent)) return;
    setError(null);
    setBusy((current) => new Set([...current, agent]));
    try {
      const next = await inboxApi.saveAgent(agent, input);
      onModel(next);
      if (next.error) setError(next.error);
      else setPending((current) => new Set([...current, ...Object.keys(input).map((key) => `${agent}:${key}`)]));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(agent);
        return next;
      });
    }
  };

  return (
    <div data-settings-agents="">
      {model.tool_env !== null && (
        <div className="ib-callout" role="note" data-tool-locked="">
          <Icon name="lock" />
          <span>
            <code>PLANNOTATOR_INBOX_TOOL={model.tool_env ? '1' : '0'}</code> 已在此收件箱的环境中设置，因此在 Claude Code、Pi 和 OpenCode 中，收件箱工具保持
            {model.tool_env ? '开启' : '关闭'}，其提醒也是如此。备注和 MCP 服务器不受影响。
          </span>
        </div>
      )}
      {model.connect_env_off && (
        <div className="ib-callout" role="note">
          <Icon name="info" />
          <span>
            <code>PLANNOTATOR_INBOX_CONNECT=0</code> 已设置，因此 <code>plannotator inbox</code> 不会自行连接智能体。下方开关仍然有效。
          </span>
        </div>
      )}
      {model.notes_env_off && (
        <div className="ib-callout" role="note">
          <Icon name="info" />
          <span>
            <code>PLANNOTATOR_INBOX_NOTES=0</code> 已设置，因此 Plannotator 不提供备注，也不会添加任何备注。已写入的备注会列在下方，你可以在那里关闭它。
          </span>
        </div>
      )}
      {error && (
        <p className="ib-error" role="alert">
          {error}
        </p>
      )}
      <div className="ib-agents">
        {enabledRow}
        {shown.map((row) => (
          <Fragment key={row.id}>
          <AgentGroup
            row={row}
            noteText={model.note_text}
            pending={pending}
            busy={busy.has(row.id)}
            settling={model.connecting}
            onChange={(input) => void change(row.id, input)}
            {...(row.id === 'claude-code' && launchRow ? { extra: <>{launchRow}{launchState?.enabled && <LaunchSettingsFile launch={launchState} busy={launchBusy} onLaunch={takeLaunch} onError={setError} />}{scratchRow}</> } : {})}
            {...(row.id === 'codex' && row.detected ? { extra: <CodexAccountRow /> } : {})}
            {...(model.sessions && (row.id === 'claude-code' || row.id === 'pi' || row.id === 'opencode') && model.sessions[row.id] ? { sessions: model.sessions[row.id] } : {})}
          />
          {row.id === t3After && model.t3 && <T3AgentGroup t3={model.t3} />}
          </Fragment>
        ))}
        {detected.length === 0 && (
          <div className="ib-agrow ib-agna">
            <span className="ib-agk">此电脑上未找到智能体</span>
          </div>
        )}
        <button type="button" className="ib-amore" aria-expanded={more} aria-controls="ib-aundet" onClick={() => setMore((open) => !open)}>
          <Icon name="chevR" />
          此电脑上未找到
          <span className="ib-mut">
            {undetected.length} 个智能体 · 请自行连接一个
          </span>
        </button>
        {more && context && (
          <div className="ib-aundet" id="ib-aundet">
            <ConnectPicker harnesses={HARNESSES} initial="vscode" context={context} icons />
          </div>
        )}
      </div>
      <p className="ib-note">
        <Icon name="info" />
        <span>
          Plannotator 绝不会覆盖你编辑过的备注，<code>plannotator uninstall</code> 会移除它在此处添加的所有内容。
        </span>
      </p>
    </div>
  );
}
