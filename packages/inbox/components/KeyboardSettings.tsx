/**
 * Settings → General → Keyboard (approval "inbox-keyboard-shortcuts"): the
 * two keyboard settings, both on by default, kept in this window's cookies
 * (shortcuts/prefs.ts). Not on a touch phone, where single keys are off (`isTouchPhone`); a narrow desktop window
 * keeps its keys, so it keeps the setting too.
 */
import { formatShortcutBindingText, getShortcutPlatform } from '@plannotator/ui/shortcuts';
import { useTouchPhone } from '../phone';
import { inboxAppShortcuts } from '../shortcuts/app.shortcuts';
import { bindingOf } from '../shortcuts/hint';
import { setKeyHints, setSingleKeys, useShortcutPrefs } from '../shortcuts/prefs';
import { inboxSearchShortcuts } from '../search/searchShortcut';
import { inboxThreadShortcuts } from '../shortcuts/thread.shortcuts';

const words = (binding: string) => formatShortcutBindingText(binding, getShortcutPlatform());

export function KeyboardSettings() {
  const prefs = useShortcutPrefs();
  const touchPhone = useTouchPhone();
  if (touchPhone) return null;
  const letters = (['markRead', 'reply', 'nextThread'] as const).map((action) => bindingOf({ scope: inboxThreadShortcuts, action })).join(', ');
  // A shifted letter is a single key too (WCAG 2.1.4): it turns off with them.
  const shifted = words(bindingOf({ scope: inboxThreadShortcuts, action: 'nextMessage' }));
  const chords = [bindingOf({ scope: inboxSearchShortcuts, action: 'openSearch' }), bindingOf({ scope: inboxThreadShortcuts, action: 'send' })].map(words).join(', ');
  const map = bindingOf({ scope: inboxAppShortcuts, action: 'openMap' });
  return (
    <section className="ib-sgroup" data-settings-keyboard="" aria-labelledby="ib-g-keyboard">
      <h2 id="ib-g-keyboard">键盘</h2>
      <div className="ib-card">
        <div className="ib-prow">
          <span className="ib-txt">
            <span className="ib-l" id="ib-single-keys-label">
              单键快捷键
            </span>
            <span className="ib-desc" id="ib-single-keys-desc">
              {letters} 以及其他按键（也包括 {shifted}）在你未输入时生效。若你使用语音输入或读屏软件的快速导航键，可将其关闭。{chords} 和 Escape 始终可用。
            </span>
          </span>
          <span className="ib-ctl">
            <button
              type="button"
              role="switch"
              className="ib-sw"
              aria-checked={prefs.singleKeys}
              aria-labelledby="ib-single-keys-label"
              aria-describedby="ib-single-keys-desc"
              onClick={() => setSingleKeys(!prefs.singleKeys)}
              data-settings-single-keys=""
            />
          </span>
        </div>
        <div className="ib-prow">
          <span className="ib-txt">
            <span className="ib-l" id="ib-key-hints-label">
              在按钮上显示按键
            </span>
            <span className="ib-desc" id="ib-key-hints-desc">
              按钮旁或其提示中显示的按键，例如「标记已读」上的 E。所有按键都列在 {map} 下，也可通过浅色/深色开关旁的键盘按钮查看。
            </span>
          </span>
          <span className="ib-ctl">
            <button
              type="button"
              role="switch"
              className="ib-sw"
              aria-checked={prefs.hints}
              aria-labelledby="ib-key-hints-label"
              aria-describedby="ib-key-hints-desc"
              onClick={() => setKeyHints(!prefs.hints)}
              data-settings-key-hints=""
            />
          </span>
        </div>
      </div>
    </section>
  );
}
