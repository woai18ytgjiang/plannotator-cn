/**
 * Decision data (approval `.product/approved/decision-data/`, 2026-11-05): Ask on top, Insights below. Since
 * 2026-11-08 (approval "settings-storage-activity") it sits in Settings -> Activity, under the hour-by-hour chart.
 * Short labels and numbers, one chart in the product's accent, two tables, a CSV. Only Settings -> Activity mounts
 * this, and this mount is the only thing that asks the server to count. Ask never waits on the count.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DecisionDataSummary, DecisionGroup, DecisionTrend } from '@plannotator/core/inbox-types';
import { inboxApi } from '../api';
import { HostMark, Icon } from '../icons';
import { inboxUrl } from '../inboxUrl';
import { DecisionAsk } from './DecisionAsk';

function useDecisionData(days: number) {
  const [model, setModel] = useState<DecisionDataSummary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    inboxApi
      .decisionData(days, controller.signal)
      .then(setModel)
      .catch(() => {
        if (controller.signal.aborted) return;
        // Old numbers under a new range would read as that range's: Ask stays, the numbers go.
        setModel(null);
        setFailed(true);
      });
    return () => controller.abort();
  }, [days]);
  return { model, failed };
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function waitWords(milliseconds: number): string {
  const minutes = Math.round(milliseconds / 60_000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 || hours >= 10 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
const percent = (part: number, of: number) => `${Math.round((part / of) * 100)}%`;
const dayLabel = (at: number | string) => new Date(typeof at === 'string' ? `${at}T12:00:00` : at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Round numbers for the axis, halves that stay whole. */
export function axisTop(most: number): number {
  for (const top of [2, 4, 6, 10, 20, 40]) if (most <= top) return top;
  return Math.ceil(most / 20) * 20;
}

/** Every how many days a date label fits. Past a few years the steps keep growing, so labels never run together. */
export function labelStep(band: number): number {
  const needed = 54 / Math.max(0.01, band);
  return [1, 2, 7, 14, 28].find((step) => step >= needed) ?? Math.ceil(needed / 28) * 28;
}

/** Columns: one series, 2 px gap, 4 px rounded data-end, square at the baseline. */
function DayColumns({ days, since, until, height }: { days: DecisionDataSummary['days']; since: number; until: number; height: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(() => {
    const byDay = new Map(days.map((day) => [day.day, day]));
    const out: DecisionDataSummary['days'] = [];
    const first = new Date(since);
    first.setHours(12, 0, 0, 0);
    for (let at = first.getTime(); at <= until + 43_200_000; at += 86_400_000) {
      const local = new Date(at);
      const key = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
      out.push(byDay.get(key) ?? { day: key, answered: 0, skipped: 0, own_words: 0 });
    }
    return out;
  }, [days, since, until]);
  const left = 26;
  const plotWidth = Math.max(0, width - left);
  const band = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.min(24, Math.max(2, band - 2));
  const most = Math.max(1, ...series.map((day) => day.answered));
  const top = axisTop(most);
  const plotHeight = height - 22;
  const headRoom = 16;
  const y = (value: number) => plotHeight - (value / top) * (plotHeight - headRoom);
  const peak = series.reduce((best, day, index) => (day.answered > (series[best]?.answered ?? 0) ? index : best), 0);
  const step = labelStep(band);
  const shown = hover === null ? null : series[hover];
  return (
    <div className="ib-dd-chart" ref={ref} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Answers per day. Most on ${dayLabel(series[peak]?.day ?? '')}: ${series[peak]?.answered ?? 0}.`}>
          {[0, top / 2, top].map((value) => (
            <g key={value}>
              <line x1={left} x2={width} y1={y(value)} y2={y(value)} className="ib-dd-grid" />
              <text x={left - 6} y={y(value) + 3.5} textAnchor="end" className="ib-dd-axis">
                {value}
              </text>
            </g>
          ))}
          {series.map((day, index) => {
            const x = left + index * band + (band - barWidth) / 2;
            const barTop = y(day.answered);
            const corner = Math.min(4, barWidth / 2);
            const center = left + index * band + band / 2;
            return (
              <g key={day.day}>
                {hover === index && <rect x={left + index * band} y={0} width={band} height={plotHeight} className="ib-dd-band" />}
                {day.answered > 0 && <path d={`M${x},${plotHeight}V${barTop + corner}Q${x},${barTop} ${x + corner},${barTop}H${x + barWidth - corner}Q${x + barWidth},${barTop} ${x + barWidth},${barTop + corner}V${plotHeight}Z`} className="ib-dd-bar" />}
                <rect x={left + index * band} y={0} width={band} height={plotHeight + 18} fill="transparent" onMouseEnter={() => setHover(index)} />
                {index % step === 0 && (
                  <text x={center > width - 22 ? width : center} y={height - 5} textAnchor={center > width - 22 ? 'end' : 'middle'} className="ib-dd-axis">
                    {dayLabel(day.day)}
                  </text>
                )}
              </g>
            );
          })}
          {series[peak] && series[peak]!.answered > 0 && hover === null && (
            <text
              x={Math.min(width - 4, left + peak * band + band / 2)}
              y={y(series[peak]!.answered) - 5}
              textAnchor={left + peak * band + band / 2 > width - 30 ? 'end' : 'middle'}
              className="ib-dd-label"
            >
              {series[peak]!.answered}
            </text>
          )}
        </svg>
      )}
      {shown && hover !== null && (
        <div className="ib-dd-tip" role="status" style={{ left: Math.min(Math.max(0, left + hover * band - 80), Math.max(0, width - 170)), top: 2 }}>
          <b>{dayLabel(shown.day)}</b>
          <span>{shown.answered} 次决策</span>
          {shown.skipped > 0 && <span>{shown.skipped} 次跳过</span>}
          {shown.own_words > 0 && <span>{shown.own_words} 条普通回复</span>}
        </div>
      )}
    </div>
  );
}

function ByDay({ days }: { days: DecisionDataSummary['days'] }) {
  return (
    <details className="ib-dd-byday">
      <summary>按天查看</summary>
      <div className="ib-dd-byday-in">
        <table className="ib-dd-tbl">
          <thead>
            <tr>
              <th>日期</th>
              <th className="ib-dd-r">决策</th>
              <th className="ib-dd-r">已跳过</th>
              <th className="ib-dd-r">普通回复</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.day}>
                <td>{dayLabel(day.day)}</td>
                <td className="ib-dd-r">{day.answered}</td>
                <td className="ib-dd-r">{day.skipped}</td>
                <td className="ib-dd-r">{day.own_words}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function GroupRows({ groups, min, kind, narrow }: { groups: DecisionGroup[]; min: number; kind: 'project' | 'agent'; narrow: boolean }) {
  const most = Math.max(1, ...groups.map((group) => group.answered));
  const took = (group: DecisionGroup) => (group.offered >= min ? percent(group.taken, group.offered) : '–');
  const closed = (group: DecisionGroup) => {
    const total = group.answered + group.skipped + group.set_aside;
    return total >= min ? percent(group.skipped + group.set_aside, total) : '–';
  };
  const wait = (group: DecisionGroup) => (group.median_wait_ms === null ? '–' : waitWords(group.median_wait_ms));
  const name = (group: DecisionGroup) => (
    <span className="ib-dd-name" title={group.label}>
      {group.host && <HostMark host={group.host} />}
      <span>{group.label}</span>
    </span>
  );
  const bar = (group: DecisionGroup) => (
    <span className="ib-dd-thin">
      <span style={{ width: `${(group.answered / most) * 100}%` }} />
    </span>
  );
  if (narrow) {
    return (
      <ul className="ib-card ib-dd-gl" data-group={kind}>
        {groups.map((group) => {
          const facts = [took(group) !== '–' ? `采纳推荐 ${took(group)}` : null, closed(group) !== '–' ? `已跳过或关闭 ${closed(group)}` : null, wait(group) !== '–' ? `通常等待 ${wait(group)}` : null].filter(Boolean);
          return (
            <li key={group.id}>
              <div className="ib-dd-gl-top">
                {name(group)}
                <span className="ib-dd-tnum">{group.answered} 次决策</span>
              </div>
              {bar(group)}
              <div className="ib-dd-gl-sub">{facts.join(' · ') || '数据太少，不足以给出可靠数字'}</div>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="ib-card" data-group={kind}>
      <table className="ib-dd-tbl">
        <thead>
          <tr>
            <th>{kind === 'agent' ? '智能体' : '项目'}</th>
            <th className="ib-dd-r">决策</th>
            <th className="ib-dd-r">采纳推荐</th>
            <th className="ib-dd-r">已跳过或关闭</th>
            <th className="ib-dd-r">通常等待</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td className="ib-dd-namecell">
                {name(group)}
                {bar(group)}
              </td>
              <td className="ib-dd-r">{group.answered}</td>
              <td className="ib-dd-r">{took(group)}</td>
              <td className="ib-dd-r">{closed(group)}</td>
              <td className="ib-dd-r">{wait(group)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Meaning() {
  return (
    <details className="ib-dd-meaning" data-decision-meaning="">
      <summary>什么算作一次决策</summary>
      <ul>
        <li>
          <b>一次决策</b>指你发出的问题卡片，带有选项、你在卡片上写的文字，或输入的回答。快速同意与艰难抉择同样计入。
        </li>
        <li>
          <b>普通回复不计入。</b> 「就选 B」可以敲定事情，但存储内容里没有说明它敲定了什么。询问仍能找到它们。
        </li>
        <li>
          <b>被替换的问题不算决策。</b> 保存在旧问题上的选择从未发出。替换后的问题在你发出后计为一次。
        </li>
        <li>
          <b>采纳推荐</b>在问题指明了推荐项时是准确的。它可能是真正的认同；数字无法分辨。
        </li>
        <li>
          <b>节奏</b>按连续作答时段统计：3 次或更多决策，且相邻间隔不到 5 分钟。简单的问题也会很快。你首次选择之前的阅读不计入。
        </li>
        <li>
          <b>趋势</b>仅在有两个完整的 30 天周期、每个周期 20 次以上，且变化大到不可能是偶然时显示。
        </li>
        <li>
          <b>等待</b>从智能体发问到发出回复计算，包含夜间。大多数智能体在此期间继续工作；只有标记为已停止的问题会让一个智能体停住。
        </li>
        <li>
          <b>这里不记录你读过什么。</b> 收件箱不记录你打开过哪些文件。
        </li>
        <li>
          <b>删除话题</b>会移除其文字，但它的记录会以无文字的形式留在这些总计中。询问无法读取已删除的话题。<code>plannotator uninstall --purge</code> 会一并移除这些记录。
        </li>
        <li>所有内容都在本机，不会发送到任何地方。</li>
      </ul>
    </details>
  );
}

const RANGES = [
  { days: 7, label: '7 天' },
  { days: 30, label: '30 天' },
  { days: 90, label: '90 天' },
  { days: 0, label: '全部' },
];

function Range({ days, onDays }: { days: number; onDays: (days: number) => void }) {
  return (
    <div className="ib-dd-range">
      <span className="ib-seg" role="radiogroup" aria-label="范围">
        {RANGES.map((range) => (
          <label key={range.days} className="ib-seg-o" data-on={days === range.days ? '' : undefined}>
            <input type="radio" name="ib-dd-range" checked={days === range.days} onChange={() => onDays(range.days)} />
            {range.label}
          </label>
        ))}
      </span>
    </div>
  );
}

interface Insight {
  key: string;
  label: string;
  value: ReactNode;
}

/** A line shows only when it has enough behind it. */
export function insightsOf(model: DecisionDataSummary): Insight[] {
  const out: Insight[] = [];
  const share = (part: number, of: number) => (of > 0 ? part / of : 0);
  const byTaken = model.agents.filter((group) => group.offered >= model.rate_min).sort((a, b) => share(b.taken, b.offered) - share(a.taken, a.offered))[0];
  if (byTaken && share(byTaken.taken, byTaken.offered) >= 0.75) {
    out.push({
      key: 'taken',
      label: `采纳了 ${byTaken.label} 的推荐`,
      value: (
        <>
          共 <b>{byTaken.offered}</b> 次中的 {byTaken.taken} 次
        </>
      ),
    });
  }
  if (model.stopped_wait.n >= model.median_min) {
    out.push({
      key: 'stopped',
      label: '已停止的智能体等待时长',
      value: (
        <>
          <b>{waitWords(model.stopped_wait.median_ms!)}</b>，共 {model.stopped_wait.n} 次
        </>
      ),
    });
  }
  const byReplaced = model.agents.filter((group) => group.replaced >= 5).sort((a, b) => b.replaced - a.replaced)[0];
  if (byReplaced) out.push({ key: 'replaced', label: `${byReplaced.label} 在你回答前被替换`, value: <b>{byReplaced.replaced}</b> });
  const closedShare = (group: DecisionGroup) => share(group.skipped + group.set_aside, group.answered + group.skipped + group.set_aside);
  const byClosed = model.projects.filter((group) => group.answered + group.skipped + group.set_aside >= model.rate_min).sort((a, b) => closedShare(b) - closedShare(a))[0];
  if (byClosed && closedShare(byClosed) >= 0.15) {
    out.push({ key: 'closed', label: `在 ${byClosed.label} 中跳过或关闭`, value: <b>{percent(byClosed.skipped + byClosed.set_aside, byClosed.answered + byClosed.skipped + byClosed.set_aside)}</b> });
  }
  const { fast, slow } = model.pace;
  if (fast.offered >= model.rate_min && slow.offered >= model.rate_min) {
    out.push({
      key: 'pace',
      label: '按节奏统计的采纳推荐',
      value: (
        <>
          每分钟超过 2 个时 <b>{percent(fast.taken, fast.offered)}</b>，低于 1 个时 <b>{percent(slow.taken, slow.offered)}</b>
        </>
      ),
    });
  }
  if (model.settled_in_words > 0) {
    out.push({
      key: 'words',
      label: '以你自己的文字结束，而非卡片选项',
      value: (
        <>
          约 <b>{model.settled_in_words}</b> 次
        </>
      ),
    });
  }
  return out;
}

const TREND_WORDS = {
  recommendations: { up: '采纳更多推荐', down: '采纳更少推荐' },
  waits: { up: '已停止的智能体等待更久', down: '已停止的智能体等待更短' },
  skips: { up: '跳过更多问题', down: '跳过更少问题' },
};

/** Up or down is the number's direction, not a verdict: no good or bad colour. No trend, no block. */
function Trends({ trends }: { trends: DecisionTrend[] }) {
  if (trends.length === 0) return null;
  return (
    <div className="ib-dd-trends" data-decision-trends="">
      <p>最近 30 天，与前 30 天对比</p>
      <ul>
        {trends.map((trend) => (
          <li key={trend.key} data-trend={trend.key} data-direction={trend.direction}>
            <span>
              <span className="ib-dd-arrow" aria-hidden="true">
                {trend.direction === 'up' ? '↑' : '↓'}
              </span>
              {TREND_WORDS[trend.key][trend.direction]}
            </span>
            <span>
              {'now_ms' in trend ? (
                <>
                  <b>{waitWords(trend.now_ms)}</b>, was {waitWords(trend.was_ms)}
                </>
              ) : (
                <>
                  <b>{Math.round(trend.now * 100)}%</b>, was {Math.round(trend.was * 100)}%
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Insights({ model, days, onDays, narrow }: { model: DecisionDataSummary; days: number; onDays: (days: number) => void; narrow: boolean }) {
  const started = model.range.earliest ?? model.range.until;
  const { counts } = model;
  const insights = insightsOf(model);
  return (
    <>
      <section className="ib-sgroup" data-decision-insights="">
        <h2>洞察</h2>
        <Trends trends={model.trends} />
        <Range days={days} onDays={onDays} />
        <p data-decision-lede="">
          Since {dayLabel(started)}: <b>{counts.answered} 次决策</b>，{counts.skipped} 次跳过，{counts.set_aside} 次标为已读关闭，{model.waiting} 个等待你处理。
        </p>
        {counts.answered + counts.skipped === 0 ? (
          <div className="ib-card ib-sempty" data-decision-filtered="">
            此范围内没有已回答的内容。{' '}
            <button type="button" className="ib-lnk" onClick={() => onDays(0)}>
              显示全部
            </button>
          </div>
        ) : (
          <>
            {insights.length > 0 && (
              <ul className="ib-dd-insights">
                {insights.map((insight) => (
                  <li key={insight.key} data-insight={insight.key}>
                    <span>{insight.label}</span>
                    <span>{insight.value}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="ib-dd-sub">按天统计的决策</h3>
            <DayColumns days={model.days} since={started} until={model.range.until} height={130} />
            <ByDay days={model.days} />
            <h3 className="ib-dd-sub">谁在提问</h3>
            <GroupRows groups={model.agents} min={model.rate_min} kind="agent" narrow={narrow} />
            <div className="ib-dd-gap" />
            <GroupRows groups={model.projects} min={model.rate_min} kind="project" narrow={narrow} />
            <p className="ib-dd-dash">破折号表示数据太少，不足以给出可靠数字。</p>
            <div className="ib-dd-foot">
              <a className="ib-lnk" href={inboxUrl('/decision-data', new URLSearchParams({ format: 'csv', days: String(days) }).toString())} data-decision-csv="">
                下载为 CSV
              </a>
              <span>每个问题一行：时间与 ID，不含文字。</span>
            </div>
          </>
        )}
      </section>
      <Meaning />
    </>
  );
}

/** Under this the table's number columns leave too little of an ordinary name ("Claud…"), so Who asks is a list. */
const TABLE_MIN_WIDTH = 640;

/** How long the section may stay empty for a count on its way: on a small store the numbers are back first, so the first paint is already right. */
const COUNT_PATIENCE_MS = 150;

export function DecisionData() {
  const [days, setDays] = useState(90);
  const { model, failed } = useDecisionData(days);
  const [patience, setPatience] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setPatience(true), COUNT_PATIENCE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width > 0 && width < TABLE_MIN_WIDTH;

  let content: ReactNode = null;
  if (failed) content = <DecisionAsk />;
  else if (!model) {
    content = patience ? (
      <>
        <DecisionAsk />
        <div className="ib-skel" aria-hidden="true" data-decision-counting="" />
      </>
    ) : null;
  } else if (model.history.asked === 0 && model.waiting === 0) {
    content = (
      <div className="ib-card ib-sempty" data-decision-empty="">
        <Icon name="inbox" />
        暂无决策。
      </div>
    );
  } else {
    const ageDays = model.history.earliest ? (model.range.until - model.history.earliest) / 86_400_000 : 0;
    content = (
      <>
        <DecisionAsk />
        {model.history.answered < 20 && ageDays < 7 ? (
          <>
            <p className="ib-lede" data-decision-lede="">
              So far: <b>{model.counts.answered} 次决策</b>
              {model.counts.skipped > 0 ? `，${model.counts.skipped} 次跳过` : ''}。
              {model.waiting > 0 && (
                <>
                  {' '}
                  当前有 {model.waiting} 个等待你处理。
                </>
              )}
            </p>
            <div className="ib-card ib-sempty" data-decision-early="">
              <Icon name="clock" />
              约一周或 20 次决策后显示洞察。
            </div>
          </>
        ) : (
          <Insights model={model} days={days} onDays={setDays} narrow={narrow} />
        )}
      </>
    );
  }
  return (
    <div ref={ref} className="ib-dd" data-decision-data="">
      {content}
    </div>
  );
}
