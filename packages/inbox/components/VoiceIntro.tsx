/**
 * The one-time voice announcement, shaped like the list options intro (ListLookIntro.tsx): a picture in the
 * always-light frame, a title, a line, then the choice. Turn on voice only sets the switch: the browser's microphone
 * prompt comes at the first press of the mic. Not now and Escape change nothing, and the Inbox has already retired it:
 * voice is an update-day dialog, so its Not now keeps the line's usual day (only an offer's Not now waits three).
 */
import { useId, useState } from 'react';
import { useTheme } from '@plannotator/ui/components/ThemeProvider';
import { Icon } from '../icons';
import { lightScope } from './ListLookIntro';
import { Modal } from './Updates';

const BARS = [0.3, 0.55, 0.8, 0.45, 0.62, 0.9, 0.5, 0.12, 0.1, 0.34, 0.7, 0.95, 0.6, 0.76, 0.4, 0.84, 0.58, 0.3, 0.42, 0.66, 0.88, 0.52];

/** The picture: a reply box mid-sentence. Not interactive. */
function Picture() {
  return (
    <div className="ib-vo-picture" aria-hidden="true">
      <div className="ib-rbox">
        <div className="ib-vo-text">
          Cards. But keep the totals column from the table design, and
          <span className="ib-vcaret" style={{ transform: 'scaleY(0.82)' }} />
        </div>
        <div className="ib-rfoot">
          <span className="ib-rclip">
            <Icon name="clip" size={16} />
          </span>
          <div className="ib-dtfoot">
            <span className="ib-vline">
              <b>正在聆听</b>
              <span className="ib-vsp" />
              <span className="ib-vbars">
                {BARS.map((level, index) => (
                  <span key={index} style={{ transform: `scaleY(${level})` }} data-v={level > 0.2 ? '' : undefined} />
                ))}
              </span>
              <span className="ib-dttime">0:07</span>
            </span>
            <span className="ib-vmic" data-state="live">
              <Icon name="mic" size={16} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoiceIntro({ phone, onTurnOn, onKeep }: { phone: boolean; onTurnOn: (phonesOnly: boolean) => void; onKeep: () => void }) {
  const { lightTheme } = useTheme();
  const [phonesOnly, setPhonesOnly] = useState(false);
  const base = `ib-vo-${useId().replace(/:/g, '')}`;
  return (
    <Modal labelledBy="ib-vo-title" describedBy="ib-vo-desc" testId="voice-intro" onClose={onKeep} ownKeys className={`ib-lo ib-vo${phone ? ' ib-lo-phone' : ''}`}>
      <div className="ib-lo-art">
        <div className={`ib-lo-frame ib-vo-frame ${lightScope(lightTheme)}`} inert>
          <Picture />
        </div>
      </div>
      <div className="ib-lo-text">
        <h2 id="ib-vo-title">用说的，不用打字</h2>
        <p id="ib-vo-desc">按住回复框中的麦克风（或点按它）然后说话。你的话语会落在输入框中，在你按发送之前不会发出。</p>
        <p className="ib-vo-route">你的音频会通过 Codex 中的 ChatGPT 登录发送到 OpenAI。此途径并非 OpenAI 官方 API，可能随时停止工作，且不会有通知。</p>
      </div>
      <div className="ib-lo-sw">
        <label className="ib-lo-opt" htmlFor={base}>
          <span id={`${base}-l`}>仅手机</span>
          <button type="button" role="switch" id={base} className="ib-sw" aria-checked={phonesOnly} aria-labelledby={`${base}-l`} onClick={() => setPhonesOnly(!phonesOnly)} data-voice-intro-phones="" />
        </label>
      </div>
      <div className="ib-lo-acts">
        <button type="button" className="ib-btn ib-ghost" onClick={onKeep} data-voice-intro-keep="">
          暂不
        </button>
        <span className="ib-bsp" />
        <button type="button" className="ib-btn ib-pri" onClick={() => onTurnOn(phonesOnly)} data-voice-intro-on="">
          开启语音
        </button>
      </div>
    </Modal>
  );
}
