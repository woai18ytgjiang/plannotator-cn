/**
 * Update on a linked machine (approval "inbox-machine-update"): the word beside it and its little dialog. That machine
 * is the truth: the row and the dialog read its own state, so a restart of this Inbox loses nothing.
 */

import { useEffect, useRef, useState } from 'react';
import { INBOX_HOST_NAMES } from '@plannotator/core/inbox-types';
import { inboxApi, InboxApiError, InboxHeldError, type ComposeSessionsModel, type MachineUpdateDetails, type MachineView } from '../api';
import { COMPOSE_SESSIONS_REFRESH_MS } from '../compose/useComposeSessions';
import { Icon } from '../icons';
import { machineNotice, type MachineNotice } from '../machines';
import { newUuid } from '../uuid';
import { CopyButton } from './ConnectPicker';
import { FailedDialog, Modal } from './Updates';
import { Tip } from './Tip';

/** Older machines can only update at the machine, once. The same line for a person and for a shell that skips their PATH. */
export const UPDATE_BY_HAND = 'plannotator update && plannotator inbox restart';
export const UPDATE_BY_HAND_FULL_PATH = '~/.local/bin/plannotator update && ~/.local/bin/plannotator inbox restart';
/** Windows PowerShell 5.1 refuses `&&`, and the full path above does not exist there. Shown to everyone: an older machine does not say what it runs on. */
export const UPDATE_BY_HAND_POWERSHELL = 'plannotator update; plannotator inbox restart';

/**
 * What an agent on an older machine receives from "Ask an agent on <machine> to update it" (the owner's call,
 * 2026-11-08), sent as the person's own New message. Agent-facing: change it only with the owner's OK of the words and
 * a clean-room run (a fresh agent given only this, a fake `plannotator`). The update goes first and the restart only
 * after it: an Inbox restart started from inside the session drops the agent's Inbox calls for a few seconds, so it is
 * the last command, and the reply waits for the Inbox to be back.
 */
export const ASK_AGENT_TO_UPDATE = [
  'Please update Plannotator on this machine. Run these two commands, one at a time, in this order:',
  '',
  '1. `plannotator update`',
  '2. `plannotator inbox restart`',
  '',
  'Run step 2 only if step 1 succeeds ("already up to date" counts as success). If `plannotator` is not found, use the full path `~/.local/bin/plannotator` (on Windows, `$env:LOCALAPPDATA\\plannotator\\plannotator.exe`).',
  '',
  'The restart stops the Inbox for a few seconds. If your reply fails right after it, wait a few seconds and try again.',
  '',
  "Don't change anything else, and don't try to fix an error. Reply here when it's done, with the version the restart printed, or with the error.",
].join('\n');
/** The thread the ask starts. */
export const ASK_AGENT_TO_UPDATE_THREAD = 'Update Plannotator';

/** Puts a version back with the install scripts' own version flag, for a machine whose new version does not start. */
export function putBackCommands(version: string): { sh: string; ps: string } {
  return {
    sh: `curl -fsSL https://plannotator.ai/install.sh | bash -s -- --version v${version}`,
    ps: `& ([scriptblock]::Create((irm https://plannotator.ai/install.ps1))) -Version v${version}`,
  };
}

/** The word in the sidebar, beside the machine: its own target, while the row still filters. */
export function MachineSidebarWord({ notice, name, onPress }: { notice: MachineNotice; name: string; onPress: () => void }) {
  const mark = notice.busy ? (
    <span className="ib-spin" aria-hidden="true" />
  ) : notice.kind === 'updated' ? (
    <Icon name="check" size={13} />
  ) : notice.kind === 'failed' || notice.kind === 'not_back' ? (
    <Icon name="info" size={13} />
  ) : null;
  return (
    <Tip content={notice.tip} side="right">
      <button
        type="button"
        className="ib-mthing"
        data-kind={notice.kind}
        aria-label={`${name}: ${notice.tip}`}
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
      >
        {mark}
        <span>{notice.word}</span>
      </button>
    </Tip>
  );
}

/** The button on a machine's row in Settings → Machines. */
export function MachineUpdateButton({ machine, onPress }: { machine: MachineView; onPress: () => void }) {
  const notice = machineNotice(machine);
  if (!notice) return null;
  if (notice.kind === 'updated') {
    return (
      <span className="ib-paired ib-mdone" data-machine-update-done="">
        <Icon name="check" size={13} /> 已更新
      </span>
    );
  }
  const word = notice.kind === 'failed' ? '查看原因' : notice.kind === 'not_back' ? '接下来怎么办' : notice.kind === 'too_old' && machine.update?.asked ? '已询问' : notice.kind === 'too_old' || notice.kind === 'by_hand' ? '如何更新' : notice.word;
  return (
    <button type="button" className={`ib-btn${notice.kind === 'update' || notice.kind === 'ready' ? ' ib-pri' : ''}`} onClick={onPress} data-machine-update={notice.kind}>
      {notice.busy && <span className="ib-spin" aria-hidden="true" />}
      {word}
      {notice.busy ? '…' : ''}
    </button>
  );
}

function Command({ text }: { text: string }) {
  return (
    <div className="ib-cmd">
      <code>{text}</code>
      <CopyButton text={text} />
    </div>
  );
}

/** What Snooze says when it opened this dialog. */
const SnoozeLine = ({ name }: { name: string }) => <p className="ib-sum">稍后提醒需要在 {name} 上有更新的 Plannotator。</p>;

/** A live agent on that machine, as its own Inbox lists it (`GET sessions` through the forward). */
interface ThereAgent {
  host: string;
  session: string;
  name: string;
  project: string;
}

/** The agent to ask: one that is idle before one that is busy (it reads the message sooner), then the most recently seen. */
export function agentToAsk(model: Partial<ComposeSessionsModel> | null): ThereAgent | null {
  const all = (Array.isArray(model?.projects) ? model.projects : []).flatMap((group) =>
    (Array.isArray(group?.sessions) ? group.sessions : []).map((session) => ({ session, project: group.project?.name ?? '' })),
  );
  const rank = (busy: boolean | null | undefined) => (busy === false ? 0 : busy === true ? 2 : 1);
  const best = [...all].sort((a, b) => rank(a.session.busy) - rank(b.session.busy) || String(b.session.last_seen_at ?? '').localeCompare(String(a.session.last_seen_at ?? '')))[0];
  return best ? { host: best.session.host, session: best.session.session, name: INBOX_HOST_NAMES[best.session.host] ?? '一个智能体', project: best.project } : null;
}

/**
 * "Ask an agent on <machine> to update it" (the owner's call, 2026-11-08), for an older machine that takes no update
 * from here. The same New message compose sends to a live session on a linked machine (the forward and its outbox), with
 * `ASK_AGENT_TO_UPDATE`; then this Inbox remembers the ask, so the row says Asked, Restarting, Updated.
 */
function useAskThere(machine: MachineView, active: boolean) {
  const online = machine.state === 'online';
  // undefined: not read yet; null: read, and no agent runs there.
  const [agent, setAgent] = useState<ThereAgent | null | undefined>(undefined);
  const [readFailed, setReadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ thread: string | null; agent: string } | null>(null);
  const [readAgain, setReadAgain] = useState(0);
  // One key per ask, so a retry after a lost answer is the same Send and never a second thread there.
  const key = useRef(newUuid());

  useEffect(() => {
    if (!active || !online) return;
    let live = true;
    const read = () =>
      inboxApi.composeSessions(null, null, machine.id).then(
        (model) => {
          if (!live) return;
          setAgent(agentToAsk(model));
          setReadFailed(false);
        },
        () => live && setReadFailed(true),
      );
    void read();
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') void read();
    }, COMPOSE_SESSIONS_REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [active, online, machine.id, readAgain]);

  const remember = (thread: string | null, who: string) => {
    setSent({ thread, agent: who });
    void inboxApi.machineUpdateAsked(machine.id, thread, who).catch(() => {});
  };

  const ask = async () => {
    if (!agent || busy) return;
    setBusy(true);
    setError(null);
    try {
      const started = await inboxApi.startThread(
        { to: { host: agent.host, session: agent.session }, body: ASK_AGENT_TO_UPDATE, idempotency_key: key.current, thread_name: ASK_AGENT_TO_UPDATE_THREAD },
        machine.id,
      );
      remember(started.thread_id, agent.name);
    } catch (cause) {
      // Held in this Inbox's outbox: it goes when that machine confirms, and its thread is not known yet.
      if (cause instanceof InboxHeldError) remember(null, agent.name);
      else if (cause instanceof InboxApiError && cause.code === 'session_not_live') {
        // That agent stopped while this was open: nothing was sent. Read who runs there now, with a new key.
        key.current = newUuid();
        setReadAgain((n) => n + 1);
        setError(`${agent.name} stopped on ${machine.name} before it got the message. Nothing was sent.`);
      } else setError(cause instanceof InboxApiError || cause instanceof Error ? cause.message : '消息未发送。请重试。');
    } finally {
      setBusy(false);
    }
  };

  // That machine's row is the truth once it says so (another tab, a reopened dialog); this tab's own Send until then.
  const asked = machine.update?.asked ?? sent;
  return { online, agent, readFailed, busy, error, asked, ask };
}

/**
 * The little dialog. It stays open through the update and follows the machine, or it can be closed at any point: the
 * row carries the same state. `onStartAgent`: New message, with the ask in it, to a new agent on that machine (remote
 * launch); absent where this window cannot start one.
 */
export function MachineUpdateDialog({ machine, snooze, onClose, onStartAgent }: { machine: MachineView; snooze: boolean; onClose: () => void; onStartAgent?: (machineId: string) => void }) {
  const [details, setDetails] = useState<MachineUpdateDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upToDate, setUpToDate] = useState(false);
  const name = machine.name;
  const notice = machineNotice(machine);
  const phase = machine.update?.phase;

  useEffect(() => {
    if (machine.state !== 'online') return;
    let live = true;
    inboxApi.machineUpdate(machine.id).then(
      (next) => live && setDetails(next),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [machine.id, machine.state, phase]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await inboxApi.startMachineUpdate(machine.id);
    } catch (cause) {
      setError(cause instanceof InboxApiError || cause instanceof Error ? cause.message : '无法开始更新。');
      setUpToDate(cause instanceof InboxApiError && cause.code === 'update_up_to_date');
    } finally {
      setBusy(false);
    }
  };

  const to = machine.update?.target ?? details?.update?.version ?? 'the newest version';
  const from = machine.update?.from ?? details?.current ?? machine.version ?? 'an older version';
  const close = (
    <button type="button" className="ib-btn" onClick={onClose}>
      Close
    </button>
  );
  const errorLine = error && <div className="ib-error">{error}</div>;
  // Its door is older than the route: nothing here can start, restart or retry an update there.
  const tooOld = machine.update?.can_update === false || details?.too_old === true;
  const said = notice?.kind === 'updated' || notice?.kind === 'updating' || notice?.kind === 'restarting' || notice?.kind === 'not_back';
  const there = useAskThere(machine, tooOld && !said);

  // A restart on the way or just done is said before anything else: the machine's own answer comes after it.
  if (notice?.kind === 'updated') {
    return (
      <Modal label={`${name} is on ${to}`} onClose={onClose} testId="machine-update-done">
        <h2 className="ib-mh2">
          <Icon name="check" size={17} /> {name} is on {to}
        </h2>
        <p className="ib-sub">Updated from {machine.update?.from}. Its threads are back.</p>
        <div className="ib-acts-row">
          <button type="button" className="ib-btn ib-pri" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }
  if (notice?.kind === 'updating' || notice?.kind === 'restarting') {
    const restarting = notice.kind === 'restarting';
    return (
      <Modal label={restarting ? `${name} 正在重启` : `正在更新 ${name}`} onClose={onClose} testId="machine-update-progress">
        <h2 className="ib-mh2">
          <span className="ib-spin" aria-hidden="true" /> {restarting ? `${name} 正在 ${to} 上重启` : `正在将 ${name} 更新到 ${to}`}
        </h2>
        <p className="ib-sub">{restarting ? '其话题稍后会恢复。' : tooOld ? `它在安装完成前会继续运行 ${from}。` : `它在安装完成前会继续运行 ${from}，然后其收件箱会重启。`} 你可以关闭此窗口，更新会继续进行。</p>
        <div className="ib-acts-row">{close}</div>
      </Modal>
    );
  }
  if (notice?.kind === 'not_back') {
    // The version it ran before the restart, when it is a plain release the install scripts can put back.
    const before = machine.update?.from;
    const putBack = before && /^\d+\.\d+\.\d+$/.test(before) ? { version: before, ...putBackCommands(before) } : null;
    return (
      <Modal label={`${name} 尚未恢复`} onClose={onClose} testId="machine-update-not-back">
        <h2>{name} 尚未恢复</h2>
        <p className="ib-sub">它正在 {to} 上重启。恢复后其话题会立即回来。</p>
        <p className="ib-sum">如果它一直未恢复，请在 {name} 的终端中运行：</p>
        <Command text="plannotator inbox --background" />
        {putBack && (
          <>
            <p className="ib-sum ib-quietline">如果这样仍无法启动，请回退到 {putBack.version}：</p>
            <Command text={putBack.sh} />
            <p className="ib-sum ib-quietline">在 Windows PowerShell 中：</p>
            <Command text={putBack.ps} />
          </>
        )}
        <div className="ib-acts-row">{close}</div>
      </Modal>
    );
  }
  if (tooOld) {
    const { agent, asked } = there;
    const canStart = !asked && there.online && agent === null && machine.launch === true && !!onStartAgent;
    // The commands are the fallback: folded while an agent there can do it, open when nothing here can.
    const byHandOpen = !asked && (!there.online || there.readFailed || (agent === null && !canStart));
    let status: React.ReactNode;
    let primary: React.ReactNode = null;
    if (asked) {
      status = (
        <div className="ib-mask" data-machine-ask="sent">
          <p className="ib-sum ib-mask-line">
            <Icon name="check" size={15} />
            <span>
              已询问 {name} 上的 {asked.agent}
            </span>
            {asked.thread ? (
              <a href={`#thread=${encodeURIComponent(asked.thread)}`} onClick={onClose} data-machine-ask-thread="">
                打开话题
              </a>
            ) : (
              <span className="ib-mask-held">正在发送到 {name}…</span>
            )}
          </p>
          <p className="ib-sum ib-quietline">它会在那里更新 Plannotator 并重启其收件箱。当 {name} 回到新版本时，这里会显示「已更新」。</p>
        </div>
      );
    } else if (!there.online) {
      status = (
        <p className="ib-sum" data-machine-ask="asleep">
          {name} 处于休眠状态。唤醒它后即可让那里的智能体更新。
        </p>
      );
    } else if (there.readFailed && agent === undefined) {
      status = (
        <p className="ib-sum" data-machine-ask="unread">
          {name} 未说明那里运行哪些智能体。
        </p>
      );
    } else if (agent === null) {
      status = (
        <p className="ib-sum" data-machine-ask="none">
          {name} 上没有可询问的智能体。{canStart ? '请在那里启动一个，并在首条消息中带上该请求。' : '请先在那里启动一个，然后在这里询问它。'}
        </p>
      );
      if (canStart) {
        primary = (
          <button type="button" className="ib-btn ib-pri" onClick={() => onStartAgent!(machine.id)} data-machine-ask-start="">
            在 {name} 上启动智能体
          </button>
        );
      }
    } else {
      status = agent ? (
        <p className="ib-sum" data-machine-ask="ready">
          {agent.name} 正在那里运行{agent.project ? `（${agent.project}）` : ''}。它会收到一条消息，要求更新 Plannotator 并重启收件箱，完成后会回复。
        </p>
      ) : null;
      primary = (
        <button type="button" className="ib-btn ib-pri" onClick={() => void there.ask()} disabled={!agent || there.busy} data-machine-ask-go="">
          {there.busy && <span className="ib-spin" aria-hidden="true" />}
          让 {name} 上的智能体更新它
        </button>
      );
    }
    return (
      <Modal label={`更新 ${name}`} onClose={onClose} testId="machine-update-too-old">
        <h2>更新 {name}</h2>
        <p className="ib-sub">它运行的是 {from}，早于设备之间可以互相更新的版本。</p>
        {snooze && <SnoozeLine name={name} />}
        {status}
        {there.error && <div className="ib-error">{there.error}</div>}
        <details className="ib-mhand" open={byHandOpen || undefined}>
          <summary>{byHandOpen ? '自行更新' : '或自行更新'}</summary>
          <p className="ib-sum">在 {name} 的终端中：</p>
          <Command text={UPDATE_BY_HAND} />
          <p className="ib-sum ib-quietline">如果提示找不到命令（SSH 可能不会加载你的 PATH），请使用完整路径：</p>
          <Command text={UPDATE_BY_HAND_FULL_PATH} />
          <p className="ib-sum ib-quietline">在 Windows PowerShell 中：</p>
          <Command text={UPDATE_BY_HAND_POWERSHELL} />
          <p className="ib-sum ib-quietline">完成这一次后，你就可以从这里更新它。</p>
        </details>
        <div className="ib-acts-row">
          {close}
          {primary}
        </div>
      </Modal>
    );
  }
  if (notice?.kind === 'failed' && details?.failure?.unchanged) {
    return (
      <Modal label={`${name} 上的更新未能安装`} onClose={onClose} testId="machine-update-unchanged">
        <h2>{name} 上的更新未能安装</h2>
        <p className="ib-sub">安装脚本未报错，但 {name} 仍运行 {from}。</p>
        {details.log && (
          <>
            <p className="ib-sum">在 {name} 上，日志说明了它做了什么：</p>
            <Command text={details.log} />
          </>
        )}
        {details.command && (
          <>
            <p className="ib-sum">或在那里自行运行安装脚本：</p>
            <Command text={details.command} />
          </>
        )}
        {errorLine}
        <div className="ib-acts-row">
          {close}
          <button type="button" className="ib-btn ib-pri" onClick={() => void start()} disabled={busy} data-machine-update-now="">
            重试
          </button>
        </div>
      </Modal>
    );
  }
  if (notice?.kind === 'failed') {
    return (
      <FailedDialog
        update={{ current: from, releaseUrl: `https://github.com/backnotprop/plannotator/releases/tag/v${to}` }}
        details={details ? { failure: details.failure ? { ...details.failure, log: details.log ?? '' } : null, log: details.log ?? '', command: details.command ?? '' } : null}
        home={null}
        machineName={name}
        error={error}
        onRetry={() => void start()}
        onClose={onClose}
      />
    );
  }
  if (notice?.kind === 'by_hand') {
    return (
      <Modal label={`自行更新 ${name}`} onClose={onClose} testId="machine-update-by-hand">
        <h2>自行更新 {name}</h2>
        <p className="ib-sub">它的 Plannotator 副本不是由安装脚本安装的，因此无法自行更新。它运行的是 {from}。</p>
        {snooze && <SnoozeLine name={name} />}
        {details?.command && (
          <>
            <p className="ib-sum">在 {name} 的终端中：</p>
            <Command text={details.command} />
          </>
        )}
        <div className="ib-acts-row">{close}</div>
      </Modal>
    );
  }
  if (machine.state === 'offline') {
    return (
      <Modal label={`${name} 处于休眠状态`} onClose={onClose} testId="machine-update-asleep">
        <h2>{name} 处于休眠状态</h2>
        <p className="ib-sub">它运行的是 {from}。唤醒它后即可从这里更新。</p>
        {snooze && <SnoozeLine name={name} />}
        <div className="ib-acts-row">{close}</div>
      </Modal>
    );
  }
  if (notice?.kind === 'ready') {
    return (
      <Modal label={`重启 ${name} 上的收件箱`} onClose={onClose} testId="machine-update-ready">
        <h2>重启 {name} 上的收件箱</h2>
        <p className="ib-sub">{to} 已在那里安装。其收件箱仍在运行 {from}。</p>
        {snooze && <SnoozeLine name={name} />}
        {errorLine}
        <div className="ib-acts-row">
          <button type="button" className="ib-btn" onClick={onClose}>
            取消
          </button>
          <button type="button" className="ib-btn ib-pri" onClick={() => void start()} disabled={busy} data-machine-update-now="">
            重启
          </button>
        </div>
      </Modal>
    );
  }
  // It asked GitHub and said so (this Inbox runs ahead of the release), and the word has gone from its row.
  if (upToDate && !notice) {
    return (
      <Modal label={`${name} 已是最新`} onClose={onClose} testId="machine-update-level">
        <h2>{name} 已是最新</h2>
        <p className="ib-sub">它运行的是 {from}。</p>
        <div className="ib-acts-row">{close}</div>
      </Modal>
    );
  }
  const reviews = details?.open_reviews ?? 0;
  return (
    <Modal label={`将 ${name} 更新到 ${to}`} onClose={onClose} testId="machine-update">
      <h2>将 {name} 更新到 {to}</h2>
      <p className="ib-sub">它运行的是 {from}。</p>
      {snooze && <SnoozeLine name={name} />}
      <p className="ib-sum">
        新版本会在那里安装，其收件箱会重启。其智能体会继续工作。
        {reviews > 0 && ` 那里有 ${reviews} 个未完成的审查会在 ${from} 上继续运行，直到你完成它们。`}
      </p>
      {errorLine}
      <div className="ib-acts-row">
        <button type="button" className="ib-btn" onClick={onClose}>
          取消
        </button>
        <button type="button" className="ib-btn ib-pri" onClick={() => void start()} disabled={busy} data-machine-update-now="">
          立即更新
        </button>
      </div>
    </Modal>
  );
}
