/**
 * The first-run entry screen, "Two paths" (approval "inbox-onboarding-tour",
 * entry: Two paths): the tour and connecting as two equal cards. "Connect my
 * agents" is a first-class path, not a skip link: it opens the real
 * first-run screen (EmptyState, "One next step"), unchanged.
 */
import type { InboxAgentsModel } from '@plannotator/core/inbox-types';
import { HostMark, Icon } from '../icons';
import { SidebarTrigger } from '../shell/sidebar';
import { connectPlan, PLUGIN_HOSTS } from '../connectSteps';
import { tourAssetUrl } from './model';
import { TourFitPicture, TourFitText } from './Fit';

export interface TourEntryModel {
  /** The agents' marks, each with whether it reaches the Inbox (null: unknown here, the tailnet page). */
  marks: { id: string; ready: boolean | null }[];
  /** "2 of 4 ready", or null when the agents are not known. */
  count: string | null;
  line: string;
}

/** What the connect card says about the agents on this computer. */
export function tourEntryModel(agents: InboxAgentsModel | null, _unavailable: 'failed' | null, live: ReadonlySet<string> = new Set()): TourEntryModel {
  const plan = agents ? connectPlan(agents, [], live) : null;
  if (!plan || plan.found.length === 0) {
    return {
      marks: PLUGIN_HOSTS.map((id) => ({ id, ready: null })),
      count: null,
      line: 'Claude Code、Pi、OpenCode 以及任何 MCP 客户端。大多只需一次点击或一条命令。',
    };
  }
  const done = new Set(plan.done.map((r) => r.id));
  const marks = plan.found.slice(0, 5).map((r) => ({ id: r.id, ready: done.has(r.id) }));
  const n = plan.found.length;
  const first = plan.done[0];
  const line =
    plan.done.length === n
      ? `在这台电脑上找到 ${n} 个，${n === 1 ? '它可以访问' : '它们都可以访问'}收件箱。`
      : first
        ? `在这台电脑上找到 ${n} 个。${first.label} 已开启；其余大多只需一次点击。`
        : `在这台电脑上找到 ${n} 个。大多只需一次点击或一条命令。`;
  return { marks, count: `已就绪 ${plan.done.length} / ${n}`, line };
}

export function TourEntry({ model, onStart, onConnect }: { model: TourEntryModel; onStart: () => void; onConnect: () => void }) {
  return (
    <section className="ib-listcol" aria-label="收件箱">
      <div className="ib-lhead">
        <SidebarTrigger />
        <h1>收件箱</h1>
      </div>
      <div className="ib-lbody">
        <div className="ib-empty ib-te-empty" data-tour-entry="">
          <h2 tabIndex={-1}>两种开始方式</h2>
          {/* The bento: how the Inbox fits with your agents, wide on top, then the two paths. */}
          <section className="ib-te-card ib-te-fit" aria-labelledby="ib-te-fit-h" data-tour-fit="">
            <div className="ib-te-fit-pic">
              <TourFitPicture />
            </div>
            <div className="ib-te-body">
              <TourFitText id="ib-te-fit-h" />
            </div>
          </section>
          <div className="ib-te-paths">
            <section className="ib-te-card ib-te-tour" aria-labelledby="ib-te-tour-h">
              <div className="ib-te-pic">
                {/* Not here: the card keeps its calm ground, never a broken image. */}
                <img src={tourAssetUrl('vs-a-thumb.webp')} alt="" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
                <span className="ib-te-time">
                  <Icon name="play" size={12} />2 分钟
                </span>
              </div>
              <div className="ib-te-body">
                <h3 id="ib-te-tour-h">看看我们如何用收件箱打造收件箱</h3>
                <p>一段真实话题的回放：Claude Code 带着设计稿提问，Plannotator 的开发者选中一个，它就开始实现。</p>
                <button type="button" className="ib-btn ib-pri" onClick={onStart} data-tour-start="">
                  <Icon name="play" size={15} />
                  开始导览
                </button>
              </div>
            </section>
            <section className="ib-te-card ib-te-connect" aria-labelledby="ib-te-con-h">
              <div className="ib-te-pic ib-te-marks">
                {model.marks.map((m) => (
                  <span key={m.id} className="ib-te-mk" data-ready={m.ready === null ? undefined : String(m.ready)}>
                    <HostMark host={m.id} big />
                  </span>
                ))}
                {model.count && <span className="ib-te-time ib-te-count">{model.count}</span>}
              </div>
              <div className="ib-te-body">
                <h3 id="ib-te-con-h">连接我的智能体</h3>
                <p>{model.line}</p>
                <button type="button" className="ib-btn ib-pri" onClick={onConnect} data-tour-connect="">
                  <Icon name="chevR" size={15} />
                  连接我的智能体
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
