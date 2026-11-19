import { useRef, useState } from 'react';
import type { InboxTidyCombine, InboxTidyRun, InboxTidyRunAgent } from '@plannotator/core/inbox-types';
import { inboxTidyWords } from '@plannotator/core/inbox-types';
import { formatCount } from '../format';
import { HostMark, Icon } from '../icons';
import { shortProjectNames } from '../projectLabels';
import { PressKeys } from '../pressKeys';
import type { TidyAcrossAgent } from '../tidyAcross';
import { Tip } from './Tip';
import type { TidyController } from './Tidy';

/**
 * What Tidy's popover shows (the list's ⋮ Tidy, and Tidy… on picked threads): the last run, then the agents to ask,
 * the person's own instructions with the last three as Recent (approval "inbox-multi-select"), and one Tidy button.
 */

/** "Tidy · 3/4" while a run shows. */
export const runLabel = (run: InboxTidyRun) => `整理 · ${run.done}/${run.agents.length}`;

/** What Tidy does whatever the person adds: one line under the field. */
export const TIDY_DOES = '每个智能体更新自己的话题：发送暂缓的内容、回复你、关闭不再适用的问题。';

const agentKey = (agent: Pick<TidyAcrossAgent, 'machine' | 'session'>) => `${agent.machine ?? ''}|${agent.session}`;


/** One suggestion per project the others go into, read by the name it will have: alone, nothing clashes. */
function combineGroups(pairs: readonly InboxTidyCombine[]) {
  const groups = new Map<string, { into: InboxTidyCombine['into']; name: string; pairs: InboxTidyCombine[] }>();
  for (const pair of pairs) {
    const group = groups.get(pair.into.id) ?? { into: pair.into, name: shortProjectNames([pair.into]).get(pair.into.id) ?? pair.into.name, pairs: [] };
    group.pairs.push(pair);
    groups.set(pair.into.id, group);
  }
  return [...groups.values()];
}

/** The last run (when there is one), then the picker when there is something to ask. */
export function TidyPanel({ tidy: given, onDone }: { tidy: TidyController; onDone: () => void }) {
  // A stale plan still being read again (`pending`: a phone taps ⋮, then Tidy, before it lands): drawn as while
  // it is first read, never the old plan or run.
  const tidy = given.pending ? { ...given, plan: null, run: null } : given;
  const { plan, run } = tidy;
  const offered = (plan?.agents.length ?? 0) > 0 || (plan?.combine?.length ?? 0) > 0;
  // Picked threads: the picker shows even after a run, so the person sees who is left to ask.
  return (
    <>
      {run && <RunPanel run={run} />}
      {(offered || !run || tidy.picked !== undefined) && <TidyPicker tidy={tidy} onDone={onDone} below={run !== null} />}
    </>
  );
}

function TidyPicker({ tidy, onDone, below }: { tidy: TidyController; onDone: () => void; below: boolean }) {
  const { plan } = tidy;
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [words, setWords] = useState('');
  // One key per opening and machine: a second press (or a retry) answers the same run; a refusal frees it.
  const [key] = useState(() => new PressKeys('tidy'));
  // Two presses before the button greys out: the second does nothing.
  const pressed = useRef(false);
  if (!plan) return <div className="ib-tidy-top"><b>整理</b></div>;
  const combine = plan.combine ?? [];
  const picking = tidy.picked !== undefined;
  const lines = whyNotAsked(plan);
  if (plan.agents.length === 0 && combine.length === 0)
    return picking ? (
      // Under a run, its agents are why nobody is left, so only the lines that say so.
      <>
        {!below && (
          <div className="ib-tidy-top" data-tidy-empty="">
            <b>整理</b>
          </div>
        )}
        {lines.length === 0 && <p className="ib-tidy-line">没有可询问的内容：这些话题的智能体均无法联系。</p>}
        {lines.map((line) => (
          <p key={line} className="ib-tidy-line">
            {line}
          </p>
        ))}
      </>
    ) : (
      <div className="ib-tidy-top" data-tidy-empty="">
        <b>整理</b>
        <span>没有可询问的内容</span>
      </div>
    );
  const agents = plan.agents;
  const picked = agents.filter((a) => !off.has(agentKey(a)));
  const pickedCombine = combine.filter((pair) => !off.has(pair.from.id));
  const allThreads = combine.length === 0 && agents.every((a) => a.items.every((i) => i.thread_id !== null));
  const tick = (ids: readonly string[], on: boolean) =>
    setOff((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  return (
    <>
      <div className="ib-tidy-top" data-below={below ? '' : undefined}>
        <b>整理</b>
        <span>{picking ? `已选 ${formatCount(tidy.picked!)} 项` : `${formatCount(plan.count)} 个${allThreads ? '话题' : '项目'}`}</span>
      </div>
      {agents.length > 0 && (
        <ul className="ib-tidy-ags">
          {agents.map((agent) => (
            <li key={agentKey(agent)}>
              <label className="ib-tidy-ag" data-tidy-agent={agent.session}>
                <input type="checkbox" checked={!off.has(agentKey(agent))} onChange={(event) => tick([agentKey(agent)], event.target.checked)} />
                <HostMark host={agent.host} agent={agent.session} />
                <span className="ib-tidy-nm">{agent.machineName ? `${agent.name} · ${agent.machineName}` : agent.name}</span>
                <em>{formatCount(agent.items.length)}</em>
              </label>
            </li>
          ))}
        </ul>
      )}
      {combine.length > 0 && (
        <>
          <div className="ib-tidy-sub" data-below={agents.length > 0 ? '' : undefined}>
            合并项目
          </div>
          <ul className="ib-tidy-ags">
            {combineGroups(combine).map((group) => {
              const ids = group.pairs.map((pair) => pair.from.id);
              return (
                <li key={group.into.id}>
                  <label className="ib-tidy-ag ib-tidy-cmb" data-tidy-combine={group.into.id}>
                    <input type="checkbox" checked={!ids.some((id) => off.has(id))} onChange={(event) => tick(ids, event.target.checked)} />
                    <Icon name="folder" size={15} />
                    <Tip content={[group.into.root, ...group.pairs.map((pair) => pair.from.root)].join('\n')}>
                      <span className="ib-tidy-nm">
                        <b dir="auto">{group.name}</b>
                        <small>
                          {formatCount(group.pairs.length + 1)} 个文件夹，{group.pairs[0]!.why}
                        </small>
                      </span>
                    </Tip>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {lines.map((line) => (
        <p key={line} className="ib-tidy-line">
          {line}
        </p>
      ))}
      {agents.length > 0 && (
        <>
          <textarea
            className="ib-tidy-words"
            rows={2}
            maxLength={500}
            placeholder="添加说明（可选）"
            aria-label="本次整理的说明（可选）"
            value={words}
            onChange={(event) => setWords(event.target.value)}
            data-tidy-words=""
          />
          <p className="ib-tidy-line">{TIDY_DOES}</p>
          {words.trim() === '' && (plan.recent?.length ?? 0) > 0 && (
            <div className="ib-tidy-recent" role="group" aria-label="最近的说明">
              <div className="ib-tidy-sub">最近</div>
              {plan.recent!.map((said) => (
                <button key={said} type="button" className="ib-tidy-said" onClick={() => setWords(said)} data-tidy-recent="">
                  <Icon name="clock" size={13} />
                  <span>{said}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <p className="ib-tidy-err" role="alert">
          {error}
        </p>
      )}
      <div className="ib-tidy-bot">
        <button
          type="button"
          className="ib-btn ib-pri ib-sm"
          disabled={(picked.length === 0 && pickedCombine.length === 0) || sending}
          data-tidy-go=""
          onClick={async () => {
            if (pressed.current) return;
            pressed.current = true;
            setSending(true);
            // The combines first: they are this window's, and an agent's prompt can wait for a retry.
            let failed: string | null = null;
            if (pickedCombine.length > 0) {
              const names = new Map(combineGroups(pickedCombine).map((group) => [group.into.id, group.name]));
              failed = (await tidy.combine?.(pickedCombine.map((pair) => ({ ...pair, into: { ...pair.into, name: names.get(pair.into.id) ?? pair.into.name } })))) ?? null;
            }
            if (!failed && picked.length > 0) {
              failed = await tidy.start(picked, key, inboxTidyWords(words) || undefined);
            }
            pressed.current = false;
            setSending(false);
            if (failed) setError(failed);
            else onDone();
          }}
        >
          整理
        </button>
      </div>
    </>
  );
}

/** Where each asked agent stands. */
function runState(agent: InboxTidyRunAgent): string {
  switch (agent.state) {
    case 'waiting':
      return agent.reach === 'next_call' ? '下次收件箱调用时' : '等待中';
    case 'delivered':
      return '已送达';
    case 'tidied':
      return agent.updated > 0 ? `已更新 ${agent.updated} 个话题` : '已更新';
    case 'nothing':
      return '无需更改';
    case 'ended':
      return '会话已结束';
  }
}

function RunPanel({ run }: { run: InboxTidyRun }) {
  const machineOf = (agent: InboxTidyRunAgent) => (agent as InboxTidyRunAgent & { machineName?: string }).machineName;
  return (
    <>
      <div className="ib-tidy-top">
        <b>{runLabel(run)}</b>
        {run.updated > 0 && <span>已更新 {run.updated} 个话题</span>}
      </div>
      <ul className="ib-tidy-ags">
        {run.agents.map((agent) => (
          <li key={agent.session} className="ib-tidy-ag ib-tidy-run" data-tidy-run-agent={agent.session} data-state={agent.state}>
            <span />
            <HostMark host={agent.host} agent={agent.session} />
            <span className="ib-tidy-nm">{machineOf(agent) ? `${agent.name} · ${machineOf(agent)}` : agent.name}</span>
            <em>{runState(agent)}</em>
          </li>
        ))}
      </ul>
      {run.words && <p className="ib-tidy-line ib-tidy-added">你添加了：“{run.words}”</p>}
    </>
  );
}

/** The lines for picked threads no agent is asked about, by why (and the machines that could not be asked). */
function whyNotAsked(plan: NonNullable<TidyController['plan']>): string[] {
  const out: string[] = [];
  const ended = plan.unreached?.ended ?? 0;
  const asked = plan.unreached?.asked ?? 0;
  if (ended === 1) out.push('1 个话题没有可询问的智能体：其会话已结束。');
  else if (ended > 1) out.push(`${formatCount(ended)} 个话题没有可询问的智能体。`);
  if (asked === 1) out.push('1 个话题的智能体刚刚被询问过。');
  else if (asked > 1) out.push(`${formatCount(asked)} 个话题的智能体刚刚被询问过。`);
  for (const machine of plan.unasked ?? []) out.push(machine.threads > 0 ? `${machine.name} 上的 ${machine.threads} 个话题目前无法询问。` : `${machine.name} 目前无法询问。`);
  return out;
}
