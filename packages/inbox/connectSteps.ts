/**
 * The first-run screen's one next step (the approved design
 * "inbox-connect-next-step", variant C): what `GET /api/inbox/agents` says
 * about each agent on this computer, as the one most useful thing to do next
 * and the short lists of what is done and what is left. Plannotator's own
 * connections come first (Claude Code, Pi, OpenCode: replies wake the
 * session), agents reached through MCP after (Codex's replies wake it too:
 * the Inbox runs `codex queue`). Pure.
 */
import { INBOX_CLAUDE_PLUGIN_INSTALL } from '@plannotator/core/inbox-launch-ready';
import { INBOX_AGENT_IDS, INBOX_HOST_NAMES, INBOX_MCP_WAKE_MIN_VERSIONS, INBOX_MCP_WAKING_HOSTS, INBOX_WAKING_HOSTS, inboxToolCostText, type InboxAgentId, type InboxAgentRow, type InboxAgentsModel } from '@plannotator/core/inbox-types';
import type { HarnessId } from './harnesses';

/** Plannotator's own connections, in the order the screen offers them. */
export const PLUGIN_HOSTS = ['claude-code', 'pi', 'opencode'] as const;
export type PluginHost = (typeof PLUGIN_HOSTS)[number];

export function isPluginHost(id: string): id is PluginHost {
  return (PLUGIN_HOSTS as readonly string[]).includes(id);
}

/** What the plugin is called on each host. */
export const PLUGIN_WORD: Readonly<Record<PluginHost, 'plugin' | 'extension'>> = { 'claude-code': 'plugin', pi: 'extension', opencode: 'plugin' };

/**
 * How one agent stands:
 *  - ready: Plannotator's plugin is installed and its Inbox tool is on.
 *  - tool-off: the plugin is installed, its Inbox tool is off (`locked` when PLANNOTATOR_INBOX_TOOL decides,
 *    `chosenOff` when config.json turns it off by name: both are left alone, never offered as a step).
 *  - mcp-only: a plugin host without the plugin, connected through MCP (replies don't wake it).
 *  - missing: a plugin host without the plugin, not connected.
 *  - mcp: another agent, connected through MCP.
 *  - connect: another agent the window can connect in one click (its `mcp add`, or one JSON key).
 *  - manual: another agent only a person can connect (`reason` says why).
 *  - absent: a plugin host not on this computer.
 */
export type ConnectState = 'ready' | 'tool-off' | 'mcp-only' | 'missing' | 'mcp' | 'connect' | 'manual' | 'absent';

export interface ConnectRow {
  id: InboxAgentId;
  label: string;
  state: ConnectState;
  locked: boolean;
  /** The person turned the tool off (config.json says false by name, the Claude Code plugin disabled, or its mod off). */
  chosenOff: boolean;
  /** What "Left to do" says for a tool the person turned off another way than inboxTool (the plugin disabled, the mod off). */
  offNote?: string;
  /** OpenCode: the version on PATH, for the plugin line that version reads. */
  generation?: '1' | '2';
  /** An agent MCP alone wakes (Codex), connected: whether this Inbox can wake it now (the server's `wakes`). */
  wakes?: boolean;
  reason: string | null;
}

/**
 * One agent's state; null for an agent that is not here, or that the person
 * turned off or connected their own way. `live`: a session of this host is
 * polling the Inbox now, which only Plannotator's own connection does, so the
 * host is connected whatever the files the Inbox can read say (a project's own
 * `.claude/settings.json`, `claude --plugin-dir`).
 */
export function connectRowOf(row: InboxAgentRow, live = false): ConnectRow | null {
  const base: Omit<ConnectRow, 'state'> = { id: row.id, label: row.label, locked: false, chosenOff: false, reason: row.reach.reason, ...(row.plugin?.generation ? { generation: row.plugin.generation } : {}), ...(typeof row.wakes === 'boolean' ? { wakes: row.wakes } : {}) };
  if (isPluginHost(row.id)) {
    if (live) return { ...base, state: 'ready' };
    if (!row.detected) return { ...base, state: 'absent' };
    // Claude Code's plugin turned off by name (`claude plugin disable`, or managed settings), or its mod off: the person's
    // choice, never a step. An MCP entry the person added by hand still reaches the Inbox, so it counts as connected.
    if (row.plugin?.disabled || row.tool?.mod_off) {
      if (row.reach.kind === 'mcp' && row.reach.on) return { ...base, state: 'mcp' };
      const offNote = row.plugin?.disabled ? (row.plugin.managed ? '插件已由托管设置关闭' : '插件已关闭') : 'Plannotator 模组已关闭';
      return { ...base, state: 'tool-off', locked: row.reach.locked, chosenOff: true, offNote };
    }
    // The plugin is installed exactly when the agent reaches the Inbox through its tool (`plugin` says so too, on a newer Inbox).
    const installed = row.plugin ? row.plugin.installed : row.reach.kind === 'tool';
    if (installed && row.reach.kind === 'tool') {
      if (row.reach.on) return { ...base, state: 'ready' };
      return { ...base, state: 'tool-off', locked: row.reach.locked, chosenOff: row.tool?.chosen_off === true };
    }
    if (row.reach.kind === 'mcp' && row.reach.on) return { ...base, state: 'mcp-only' };
    return { ...base, state: 'missing' };
  }
  if (!row.detected) return null;
  // DeepSeek Harness: Plannotator's plugin, reached through its tool, but not on the first-run screen's host cards.
  if (row.reach.kind === 'tool') {
    if (live || row.reach.on) return { ...base, state: 'ready' };
    return { ...base, state: 'tool-off', locked: row.reach.locked, chosenOff: row.tool?.chosen_off === true };
  }
  if (row.reach.on) return { ...base, state: 'mcp' };
  if (row.reach.kind === 'manual') return { ...base, state: 'manual' };
  // Not connected yet; one the person turned off, removed, or holds an entry of their own is theirs to decide.
  if (row.reach.kind === 'mcp' && row.reach.state === 'not_connected') return { ...base, state: 'connect' };
  return null;
}

/** Done: reaches the Inbox (through the plugin, or through MCP). */
export function isDone(row: ConnectRow): boolean {
  return row.state === 'ready' || row.state === 'mcp' || row.state === 'mcp-only';
}

/** A step the screen can offer: something left that the person can act on (a locked tool, or one the person turned off, is not one). */
export function isStep(row: ConnectRow): boolean {
  if (row.state === 'tool-off') return !row.locked && !row.chosenOff;
  return row.state === 'missing' || row.state === 'mcp-only' || row.state === 'connect' || row.state === 'manual';
}

/** Plannotator's own connections first (turn on, then install, then the plugin for an MCP-only host), MCP agents after. */
export function stepOrder(row: ConnectRow): number {
  const host = PLUGIN_HOSTS.indexOf(row.id as PluginHost);
  if (host >= 0) return host + 1 + ({ 'tool-off': 0, missing: 10, 'mcp-only': 20 } as Partial<Record<ConnectState, number>>)[row.state]!;
  return 40 + INBOX_AGENT_IDS.indexOf(row.id);
}

export interface ConnectPlan {
  /** Agents were found, nothing is left to offer, and none reaches the Inbox (tools locked or turned off, or every step put off). */
  blocked: boolean;
  /** Every agent the screen speaks about: Plannotator's hosts first, then the others in INBOX_AGENT_IDS order. */
  rows: ConnectRow[];
  /** The agents on this computer (absent plugin hosts left out). */
  found: ConnectRow[];
  /** What is left to do, in step order, without the ones put off with Not now. */
  steps: ConnectRow[];
  /** The one next step, or null (nothing left, or nothing found). */
  next: ConnectRow | null;
  done: ConnectRow[];
  /** Left, after the next step: the other steps, the ones put off, the tools locked or turned off. */
  later: ConnectRow[];
  /** Plugin hosts not on this computer. */
  absent: ConnectRow[];
}

export function connectPlan(model: InboxAgentsModel, skipped: readonly string[] = [], live: ReadonlySet<string> = new Set()): ConnectPlan {
  // Plannotator's own connections first, then the others, each in INBOX_AGENT_IDS order.
  const rank = (row: ConnectRow) => (isPluginHost(row.id) ? PLUGIN_HOSTS.indexOf(row.id) : PLUGIN_HOSTS.length + INBOX_AGENT_IDS.indexOf(row.id));
  const rows = model.agents
    .map((row) => connectRowOf(row, live.has(row.id)))
    .filter((row): row is ConnectRow => row !== null)
    .sort((a, b) => rank(a) - rank(b));
  const found = rows.filter((row) => row.state !== 'absent');
  const all = found.filter(isStep).sort((a, b) => stepOrder(a) - stepOrder(b));
  const steps = all.filter((row) => !skipped.includes(row.id));
  const next = steps[0] ?? null;
  const locked = found.filter((row) => row.state === 'tool-off' && (row.locked || row.chosenOff));
  const putOff = all.filter((row) => skipped.includes(row.id));
  const done = found.filter(isDone);
  return {
    blocked: found.length > 0 && !next && done.length === 0,
    rows,
    found,
    steps,
    next,
    done,
    later: [...steps.slice(1), ...putOff, ...locked],
    absent: rows.filter((row) => row.state === 'absent'),
  };
}

/** The eyebrow over the next step: "Next step" (drawn in capitals) and where it stands. */
export function stepEyebrow(plan: ConnectPlan): { label: string; count: string } {
  return { label: '下一步', count: plan.steps.length > 1 ? `第 1 步，共 ${plan.steps.length} 步` : '最后一步' };
}

/** The next step's title. */
export function stepTitle(row: ConnectRow): string {
  const word = isPluginHost(row.id) ? PLUGIN_WORD[row.id] : '插件';
  switch (row.state) {
    case 'tool-off':
      return `开启 ${row.label} 的收件箱工具`;
    case 'mcp-only':
      return `为 ${row.label} 安装 Plannotator 的${word}`;
    case 'missing':
      return `用 Plannotator 的${word}连接 ${row.label}`;
    case 'connect':
      return `连接 ${row.label}`;
    case 'manual':
      return `你自行连接 ${row.label}`;
    default:
      return row.label;
  }
}

/** The next step's sentence, in parts so the cost can be bold. */
export function stepText(row: ConnectRow): { text: string; cost?: string } {
  const word = isPluginHost(row.id) ? PLUGIN_WORD[row.id] : '插件';
  switch (row.state) {
    case 'tool-off':
      if (row.id === 'claude-code') return { text: '开启它，让 Claude Code 能向你发送消息，并在会话中收到你的回复。' };
      return {
        text: `Plannotator 的${word}已安装。开启其收件箱工具，让 ${row.label} 能向你发送消息并在会话中收到你的回复。这会把该工具添加到每次 ${row.label} 请求中：`,
        cost: inboxToolCostText(row.id as 'pi' | 'opencode'),
      };
    case 'mcp-only':
      return { text: `${row.label} 只有在检查收件箱时才能看到你的回复。使用 Plannotator 的${word}后，回复会作为新轮次自动送达，你也可以向正在运行的会话发送消息。` };
    case 'missing':
      if (row.id === 'claude-code') return { text: 'Plannotator 的插件负责连接它：你的回复会作为新轮次自动送达。' };
      if (row.id === 'opencode' && row.generation === '1') {
        return { text: 'Plannotator 的插件负责连接它。OpenCode 1 在检查收件箱时看到你的回复；在 OpenCode 2 中，回复会作为新轮次自动送达。' };
      }
      if (row.id === 'opencode') return { text: 'Plannotator 的插件负责连接它：在 OpenCode 2 中，你的回复会作为新轮次自动送达。' };
      return { text: `Plannotator 的${word}负责连接它。` };
    case 'connect':
      // Codex: the Inbox wakes it itself through `codex queue` (INBOX_MCP_WAKING_HOSTS), from the version that has it.
      if (INBOX_MCP_WAKING_HOSTS.includes(row.id)) {
        return { text: `将收件箱的 MCP 服务器添加到 ${row.label}。${mcpWakeName(row.id)}：你的回复会作为新轮次自动送达。` };
      }
      return { text: `将收件箱的 MCP 服务器添加到 ${row.label}。${row.label} 在检查收件箱时看到你的回复；无法被唤醒。` };
    case 'manual':
      return { text: row.reason ? `只有你能在此添加它：${row.reason}。` : '只有你能在此添加它。' };
    default:
      return { text: '' };
  }
}

/**
 * Why nothing reaches the Inbox when agents were found and nothing is left to
 * offer (`plan.blocked`): the tools PLANNOTATOR_INBOX_TOOL locks, the ones
 * the person turned off, the steps put off with Not now. Sentences, in that order.
 */
export function blockedText(plan: ConnectPlan, opts: { skipped: readonly string[]; toolEnv: boolean | null }): { text: string; settings: boolean } {
  const names = (rows: readonly ConnectRow[]) => {
    const labels = rows.map((row) => row.label);
    return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join('、')} 和 ${labels[labels.length - 1]}`;
  };
  const off = plan.found.filter((row) => row.state === 'tool-off' && (row.chosenOff || row.offNote));
  const locked = plan.found.filter((row) => row.state === 'tool-off' && row.locked && !off.includes(row));
  const putOff = plan.found.filter((row) => opts.skipped.includes(row.id));
  const parts: string[] = [];
  if (locked.length) parts.push(`PLANNOTATOR_INBOX_TOOL=${opts.toolEnv ? '1' : '0'} 使 ${names(locked)} 的收件箱工具保持关闭。`);
  for (const row of off) {
    if (row.offNote === '插件已关闭') parts.push(`Plannotator 的插件在 ${row.label} 中已关闭（运行 claude plugin enable plannotator@plannotator 可重新开启）。`);
    else if (row.offNote === '插件已由托管设置关闭') parts.push(`你所在组织的托管设置关闭了 ${row.label} 中 Plannotator 的插件。`);
    else if (row.offNote) parts.push(`Plannotator 的 ${row.label} 模组已关闭（PLANNOTATOR_CLAUDE_MOD 或 claudeCodeMod），因此 ${row.label} 没有收件箱工具。`);
  }
  const toolOff = off.filter((row) => !row.offNote);
  if (toolOff.length) parts.push(`你关闭了 ${names(toolOff)} 的收件箱工具。`);
  if (putOff.length) parts.push(`你将 ${names(putOff)} 推迟到了以后。`);
  return { text: parts.join(' '), settings: toolOff.length > 0 };
}

/**
 * The plain statement of which agents a reply wakes, said once on the
 * first-run screen: Plannotator's own connections put the person's reply into
 * the session as a new turn; an agent reached through MCP reads it when it
 * next checks. OpenCode 1 has the tool but no wake, hence "OpenCode 2".
 */
/** "Claude Code, Pi and OpenCode 2". */
const andList = (names: readonly string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
/** A waking host as the wake line names it: OpenCode 2 (OpenCode 1 has no wake). */
const wakeName = (host: string) => (host === 'opencode' ? 'OpenCode 2' : (INBOX_HOST_NAMES[host] ?? host));
/** An agent MCP alone wakes, from the version that can be: "Codex 0.149 or later", "Qwen Code 0.24 or later". */
export function mcpWakeName(host: string): string {
  const min = INBOX_MCP_WAKE_MIN_VERSIONS[host];
  return min ? `${INBOX_HOST_NAMES[host] ?? host} ${min.replace(/\.0$/, '')} 或更高版本` : (INBOX_HOST_NAMES[host] ?? host);
}
// The first-run line names no DeepSeek Harness (the owner, #2529): it keeps its words whether DSH is here or not,
// though a reply does wake a DSH session through Plannotator's plugin. Cline likewise (its plugin; words unchanged).
const WAKE_LINE_UNNAMED: ReadonlySet<string> = new Set(['dsh', 'cline', 'openclaw', 'hermes']);
const BRIDGE_HOSTS = INBOX_WAKING_HOSTS.filter((host) => !INBOX_MCP_WAKING_HOSTS.includes(host) && !WAKE_LINE_UNNAMED.has(host));

/**
 * Which agents a reply wakes, built from the one list (INBOX_WAKING_HOSTS).
 * `mcpHosts`: the agents MCP alone wakes that are on this computer (Codex,
 * when its row is present); none, the line names Plannotator's hosts only.
 */
export function wakeLine(mcpHosts: readonly string[] = []): string {
  const mcp = INBOX_MCP_WAKING_HOSTS.filter((host) => mcpHosts.includes(host));
  const through = mcp.length > 0 ? `，以及通过 MCP 接入的 ${andList(mcp.map(mcpWakeName))}` : '';
  return `通过 Plannotator 的连接，你的回复会在 ${andList(BRIDGE_HOSTS.map(wakeName))} 中作为新轮次自动送达${through}。其他智能体在下次检查收件箱时会看到你的回复。`;
}

/** Over the "Another agent or editor" picker: every agent there reaches the Inbox through MCP; only an MCP-waking agent present (Codex) is woken. */
export function mcpWakeLine(mcpHosts: readonly string[] = []): string {
  const mcp = INBOX_MCP_WAKING_HOSTS.filter((host) => mcpHosts.includes(host));
  if (mcp.length === 0) return '这些通过 MCP 接入收件箱：它们在下次检查时会看到你的回复，且无法被唤醒。';
  const gets = '会作为新轮次收到你的回复';
  return `这些通过 MCP 接入收件箱：${andList(mcp.map(mcpWakeName))} ${gets}；其他智能体在下次检查收件箱时才能看到你的回复，且无法被唤醒。`;
}

/** The agents MCP alone wakes whose row is on this computer (detected): the wake lines name only those. */
export function mcpWakingHostsHere(model: InboxAgentsModel | null | undefined): string[] {
  return (model?.agents ?? []).filter((row) => row.detected && INBOX_MCP_WAKING_HOSTS.includes(row.id)).map((row) => row.id);
}

/** The wake line on a computer without an agent MCP alone wakes (no Codex): Plannotator's hosts only. */
export const WAKE_LINE = wakeLine();
/** The picker's line on a computer without Codex. */
export const MCP_WAKE_LINE = mcpWakeLine();

/** "Already connected" for an agent reached through MCP. */
export const MCP_DONE_NOTE = 'MCP · 检查时看到回复';
/** "Already connected" for an agent reached through MCP that the Inbox wakes (Codex 0.149+). */
export const MCP_WAKES_DONE_NOTE = 'MCP · 回复作为新轮次送达';

/** The MCP fold under a Plannotator host's install step. */
export function mcpFoldHint(label: string): string {
  return `可用，但 ${label} 只有在检查收件箱时才能看到你的回复；回复不会作为新轮次送达。`;
}

/** What the "Already connected" line says after the name. */
export function doneNote(row: ConnectRow, opts: { live: boolean; turnedOn: boolean }): string {
  if (row.state === 'ready') {
    if (opts.turnedOn) return row.id === 'dsh' ? '在 DeepSeek Harness 下次启动时' : row.id === 'openclaw' ? '下一条消息' : '下次会话';
    const word = isPluginHost(row.id) ? PLUGIN_WORD[row.id] : '插件';
    return opts.live ? `${word} · 正在运行` : word;
  }
  // Codex over MCP, with a Codex the Inbox can wake: the reply arrives as a turn.
  if (row.state === 'mcp' && row.wakes === true) return MCP_WAKES_DONE_NOTE;
  // MCP-only, Plannotator's host or not: nothing wakes it, it reads replies when it checks.
  return MCP_DONE_NOTE;
}

/** What the "Left to do" line says after the name. */
export function laterNote(row: ConnectRow, opts: { skipped: boolean; toolEnv: boolean | null }): string {
  if (row.state === 'tool-off' && row.offNote) return row.offNote;
  if (row.state === 'tool-off' && row.locked) return `由 PLANNOTATOR_INBOX_TOOL=${opts.toolEnv ? '1' : '0'} 锁定`;
  if (row.state === 'tool-off' && row.chosenOff) return '已关闭';
  if (opts.skipped) return '稍后';
  if (row.state === 'tool-off') return '开启';
  if (row.state === 'connect') return '连接';
  if (row.state === 'manual') return '自行连接';
  return '安装';
}

/** The picker tab whose command connects an agent by hand. */
export function harnessOf(id: InboxAgentId): HarnessId {
  return id as HarnessId;
}

/** The commands that install Plannotator's own connection. */
export const CLAUDE_PLUGIN_INSTALL = INBOX_CLAUDE_PLUGIN_INSTALL;
export const PI_EXTENSION_INSTALL = 'pi install npm:@plannotator/pi-extension';
export const OPENCODE_PLUGIN_LINES = {
  '2': '"plugins": [{ "package": "@plannotator/opencode@latest" }]',
  '1': '"plugin": ["@plannotator/opencode@latest"]',
} as const;
export const OPENCODE_CONFIG_PATH = '~/.config/opencode/opencode.json';

/** "In a new Claude Code or Codex session, ask:" — the first two agents that reach the Inbox. */
export function tryWho(names: readonly string[]): string {
  return names.length ? `在新的 ${names.slice(0, 2).join(' 或 ')} 会话中，问：` : '智能体连接后，在新的会话中问它：';
}

/** The sentence an agent is given to try the Inbox. */
export const TRY_PROMPT = '在我的 Plannotator 收件箱中给我发一条测试消息。';
