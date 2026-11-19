import type { InboxLaunchRecord, InboxMessageWire } from '@plannotator/core/inbox-types';
import { selfMachineId } from '../inboxUrl';
import { startedWords } from '../scheduled/thread';
import { LaunchChoiceMeta } from './LaunchChoiceMeta';
import { hostName } from './NewMessage';

/**
 * A launched thread's meta line: "You started Claude Code in acme-api" ("Routine · Claude Code in acme-api"
 * when a schedule started it), then Full permissions and what was asked at launch.
 */
export function StartedBy({ launched, root, project }: { launched: InboxLaunchRecord; root: InboxMessageWire | undefined; project: string }) {
  return (
    <div className="ib-tmeta" data-started-by="" data-launched={launched.id}>
      <span>
        {startedWords(root)}
        {hostName(launched.agent)} 在 <bdi>{project}</bdi> 中
        {/* Started from another linked machine's window (remote launch): which one. */}
        {launched.from && launched.from.machine !== selfMachineId() && <> 来自 {launched.from.name}</>}
      </span>
      {launched.full_permissions && (
        <>
          <span className="ib-tdot" aria-hidden="true" />
          <span data-launch-full="">完全权限</span>
        </>
      )}
      <LaunchChoiceMeta launch={launched} />
    </div>
  );
}
