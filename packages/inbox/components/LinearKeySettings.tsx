import { useEffect, useState, type FormEvent } from 'react';
import type { InboxLinearKeyState } from '@plannotator/core/inbox-types';
import { post } from '../api';
import { Icon } from '../icons';
import { inboxUrl } from '../inboxUrl';
import { checkLinearKey, refreshLinearCards, useLinearKeyVerdict, type LinearKeyVerdict } from '../linearCards';

declare module '../api' {
  interface SettingsModel {
    /** Settings → Accounts → Linear: never the key, only its source and, for a saved one, its last 4. */
    linear_key?: InboxLinearKeyState;
  }
}

/** Only from this window's own Inbox; the answer never holds the key. Null removes it. */
const saveLinearKey = (key: string | null) => post<{ key: InboxLinearKeyState }>(inboxUrl('/linear/key'), { key });

const HINT = '悬停链接时显示 Linear 事项。';

/** What the last Linear answer said of the key shown; nothing until one did (no gate: a key saves either way). */
function verdictText(verdict: LinearKeyVerdict | null): string | null {
  if (verdict === 'accepted') return 'Linear 已接受。';
  if (verdict === 'refused') return 'Linear 拒绝了它，因此卡片无法加载。请换成一个可用的密钥。';
  return null;
}

/**
 * The last save's answer, and the settings read it replaced: the page's settings model is not reread after a save, so
 * leaving Settings and coming back would show the old state. A newer read (another object) wins again.
 */
let lastSave: { over: InboxLinearKeyState; key: InboxLinearKeyState } | null = null;

export function LinearKeySettings({ initial, where }: { initial: InboxLinearKeyState; /** The computer that keeps it. */ where: string }) {
  const [key, setKeyState] = useState(() => (lastSave?.over === initial ? lastSave.key : initial));
  const setKey = (next: InboxLinearKeyState) => {
    lastSave = { over: initial, key: next };
    setKeyState(next);
  };
  const [replacing, setReplacing] = useState(false);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verdict = useLinearKeyVerdict();
  const told = verdictText(verdict);
  useEffect(() => {
    if (key.source) void checkLinearKey();
  }, [key.source]);
  const save = async (next: string | null) => {
    setSaving(true);
    setError(null);
    try {
      setKey((await saveLinearKey(next)).key);
      setReplacing(false);
      setTyped('');
      void refreshLinearCards();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '密钥未保存。');
    } finally {
      setSaving(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim()) void save(typed);
  };

  let row;
  if (key.source === 'env') {
    row = (
      <div className="ib-prow" data-linear-key="env">
        <span className="ib-txt">
          <span className="ib-l">使用 LINEAR_API_KEY</span>
          <span className="ib-desc" data-linear-key-verdict={verdict ?? undefined}>
            {told ? `${told} ` : ''}
            {HINT} 它设置在此收件箱的环境中。
          </span>
        </span>
      </div>
    );
  } else if (key.source === 'saved' && !replacing) {
    row = (
      <div className="ib-prow" data-linear-key="saved">
        <span className="ib-txt">
          <span className="ib-l">
            <span className="ib-paired">
              {verdict !== 'refused' && <Icon name="check" size={14} />}
              密钥已保存，结尾为 {key.last4}
            </span>
          </span>
          <span className="ib-desc" data-linear-key-verdict={verdict ?? undefined}>
            {told ? `${told} ` : ''}
            {HINT}
          </span>
        </span>
        <span className="ib-ctl">
          <button type="button" className="ib-btn" onClick={() => setReplacing(true)} data-linear-key-replace="">
            替换
          </button>
          <button type="button" className="ib-btn ib-ghost" disabled={saving} onClick={() => void save(null)} data-linear-key-remove="">
            移除
          </button>
        </span>
      </div>
    );
  } else {
    row = (
      <form className="ib-prow ib-vkeyrow" onSubmit={submit} data-linear-key="empty">
        <span className="ib-txt">
          <label className="ib-l" htmlFor="ib-linear-key">
            API 密钥
          </label>
          <span className="ib-desc">
            {HINT} 保存在 {where} 上，之后不再显示。
          </span>
        </span>
        <span className="ib-ctl ib-vkeyctl">
          <input id="ib-linear-key" className="ib-vkey" type="password" autoComplete="new-password" spellCheck={false} placeholder="lin_api_…" value={typed} onChange={(event) => setTyped(event.target.value)} />
          <button type="submit" className="ib-btn" disabled={saving || !typed.trim()}>
            保存
          </button>
        </span>
      </form>
    );
  }
  return (
    <section className="ib-acct-m" aria-labelledby="ib-acct-linear" data-settings-linear="">
      <h2 className="ib-acct-mh" id="ib-acct-linear">
        Linear
      </h2>
      <div className="ib-acct-linear">{row}</div>
      {error && (
        <div className="ib-error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
