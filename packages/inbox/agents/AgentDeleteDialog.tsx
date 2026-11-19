/**
 * The sidebar agent's Delete … session… (its ⋯, right-click, the phone's sheet): asked in place, over the list and the
 * thread as they are, never by opening the launch's thread. The Inbox's own modal (`Modal`, Updates.tsx) laid out as
 * the Mark read warning (MarkReadWarning.tsx), with the launch thread's confirm words and its destructive button
 * (Thread.tsx `data-launch-confirm`). Focus starts on Cancel; Escape, a click outside and Cancel change nothing.
 * Its threads (the ones the agent's filter shows) stay unless the box is ticked, which archives them.
 */
import { useId, useState } from 'react';
import { agentHostName } from './model';
import { Modal } from '../components/Updates';

export interface AgentDeleteDialogProps {
  /** The agent's host (`InboxAgent.host`): the title names its kind, as the thread's confirm does. */
  host: string | null;
  /** Its scratch folder's name, which Delete removes too; null in a project. */
  scratch: string | null;
  /** How many of its threads the list holds (not archived). */
  threads: number;
  onCancel: () => void;
  onDelete: (archive: boolean) => void;
}

export function AgentDeleteDialog({ host, scratch, threads, onCancel, onDelete }: AgentDeleteDialogProps) {
  const id = useId();
  const [archive, setArchive] = useState(false);
  const kind = agentHostName(host);
  const stays = threads === 0 || archive ? null : threads === 1 ? '它的话题会保留。' : '它的话题会保留。';
  return (
    <Modal labelledBy={`${id}-t`} describedBy={`${id}-d`} onClose={onCancel} testId="agent-delete" ownKeys initialFocus="[data-agent-delete-cancel]" className="ib-agdel">
      <h2 id={`${id}-t`}>删除 {kind} 会话？</h2>
      <p className="ib-sum" id={`${id}-d`}>
        {scratch ? (
          <>
            它会停止，其会话文件和临时文件夹 <bdi>{scratch}</bdi>（包含其中的所有内容）都会被删除。
          </>
        ) : (
          '它会停止，其会话文件会被删除。'
        )}
        {stays && ` ${stays}`}
      </p>
      {threads > 0 && (
        <label className="ib-opt ib-agdel-archive" data-agent-delete-archive="">
          <input type="checkbox" checked={archive} onChange={(event) => setArchive(event.target.checked)} />
          <span>{threads === 1 ? '同时归档它的话题' : `同时归档它的 ${threads} 个话题`}</span>
        </label>
      )}
      <div className="ib-acts-row">
        <button type="button" className="ib-btn ib-ghost" onClick={onCancel} data-agent-delete-cancel="">
          取消
        </button>
        <button type="button" className="ib-btn ib-danger" onClick={() => onDelete(archive)} data-agent-delete-go="">
          删除会话
        </button>
      </div>
    </Modal>
  );
}
