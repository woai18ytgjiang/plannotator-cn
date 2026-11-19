import { useId } from 'react';
import { Icon } from '../icons';
import { SidebarTrigger } from '../shell/sidebar';

/**
 * A `#board` link while the Board is off (approval "inbox-board", 2026-10-26:
 * the Board is something the person turns on). It says so, what turning it on
 * does, and offers the one way: Turn it on (Settings → Capabilities has the
 * same switch, and the page links there). Nothing of the Board shows while it is off; its cards are kept.
 */
export function BoardOff({ onTurnOn, error }: { onTurnOn: () => void; error: string | null }) {
  const titleId = useId();
  return (
    <section className="ib-bpage" aria-labelledby={titleId} data-board-page="" data-board-view="off">
      <div className="ib-bhead">
        <SidebarTrigger />
        <h1 id={titleId} tabIndex={-1}>
          看板
        </h1>
      </div>
      <div className="ib-boff" data-board-off="">
        <span className="ib-boff-icon" aria-hidden="true">
          <Icon name="board" size={22} />
        </span>
        <h2>看板已关闭</h2>
        <p>
          开启后你会得到一个展示进行中工作的页面：每项工作一张卡片，按所处阶段放在对应列中，由你的智能体保持更新。智能体会在下一个会话中开始使用它。再次关闭后，所有卡片都会保留。
        </p>
        <button type="button" className="ib-btn ib-pri" onClick={onTurnOn} data-board-turn-on="">
          开启
        </button>
        <p className="ib-boff-note" data-board-settings-link="">
          同一个开关也在 <a href="#settings/capabilities">设置 → 能力</a> 中。
        </p>
        {error && (
          <p className="ib-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
