import { Tip } from '../components/Tip';
import { Icon } from '../icons';

export function BoardChip(props: { on: boolean; onToggle: () => void }) {
  return (
    <Tip content={props.on ? '发送后显示在你的看板上' : '在看板上跟踪'}>
      <button type="button" className="ib-cp-board" aria-pressed={props.on} aria-label="在「看板」中跟踪" data-compose-board="" onClick={props.onToggle}>
        <span className="ib-cp-board-box" aria-hidden="true">
          {props.on && <Icon name="check" size={11} />}
        </span>
        Board
      </button>
    </Tip>
  );
}
