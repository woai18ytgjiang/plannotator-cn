import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inboxApi, type LanState, type PairedDevice, type PairingAttempt, type PairingChecks, type PairingOffer, type PairingOfferView, type TailnetState } from '../api';
import { Icon, TailscaleMark, type IconName } from '../icons';
import {
  attemptNotes,
  canShowCode,
  continueHint,
  hasFailure,
  pairedVia,
  tailscaleCheckLines,
  tailscalePhoneNeeds,
  troubleshooting,
  waysOn,
  wifiCheckLines,
  wifiPhoneNeeds,
  type CheckLine,
} from '../pairing';
import { qrModules } from '../qr';
import { isTextCut, Tip } from './Tip';

/** How often the code's screen looks for the phone that scanned it, and for what reached the door. */
const PAIRED_POLL_MS = 2000;

/** The pairing link as a QR code: black on white whatever the theme, so every camera reads it. */
function QrCode({ link }: { link: string }) {
  const path = useMemo(() => qrModules(link), [link]);
  return (
    <svg className="ib-qr" viewBox={`-2 -2 ${path.size + 4} ${path.size + 4}`} role="img" aria-label="配对二维码" data-pair-qr="" shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={path.size + 4} height={path.size + 4} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}

function countdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const CHECK_ICON: Record<CheckLine['status'], { icon: IconName; word: string }> = {
  ok: { icon: 'checkCircle', word: '就绪' },
  warn: { icon: 'excl', word: '警告' },
  fail: { icon: 'xCircle', word: '问题' },
  later: { icon: 'minus', word: '尚未检查' },
};

function Checks({ lines }: { lines: CheckLine[] }) {
  return (
    <ul className="ib-checks">
      {lines.map((line) => (
        <li key={line.text} className={`ib-ck-${line.status}`} data-check={line.status}>
          <Icon name={CHECK_ICON[line.status].icon} size={14} />
          <span>
            <span className="ib-sr">{CHECK_ICON[line.status].word}: </span>
            {line.text}
            {line.fix && <span className="ib-fix">{line.fix}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Needs({ items }: { items: string[] }) {
  return (
    <ul className="ib-checks">
      {items.map((item) => (
        <li key={item} className="ib-ck-need">
          <Icon name="phone" size={14} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export interface PairFlowProps {
  lan: LanState | null;
  tailnet: TailnetState | null;
  busy: boolean;
  /** The switches' last refusal (a way that could not be turned on), in the Inbox's words. */
  error: string | null;
  onSwitchLan: (on: boolean) => Promise<unknown>;
  onSwitchTailnet: (on: boolean) => Promise<unknown>;
  /** Read the ways again (after Check again). */
  onRefreshWays: () => void;
  readDevices: () => Promise<PairedDevice[]>;
  /** Done (step 3) or Cancel: back to Devices. */
  onClose: (paired: boolean) => void;
}

type Step = 'reach' | 'scan' | 'paired';

/**
 * Pair a phone, inline in Devices (design of record
 * `.product/approved/inbox-settings-tabs/`, section 4): always starts at
 * step 1 (owner, decision 3), "How will your phone reach this computer?",
 * then the code, then Paired. The code is shown only once a way is switched
 * on; the checks beside each way never hold the person in step 1 (pairing.ts).
 */
export function PairFlow({ lan, tailnet, busy, error, onSwitchLan, onSwitchTailnet, onRefreshWays, readDevices, onClose }: PairFlowProps) {
  const [step, setStep] = useState<Step>('reach');
  const [checks, setChecks] = useState<PairingChecks | null>(null);
  const [checking, setChecking] = useState(false);
  const [checksError, setChecksError] = useState<string | null>(null);
  const [offer, setOffer] = useState<PairingOffer | null>(null);
  const [view, setView] = useState<PairingOfferView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [making, setMaking] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [paired, setPaired] = useState<{ name: string; via: PairingAttempt['via'] | null } | null>(null);
  /** "Show the code" pressed with no way on: say so beside the button (the gate). */
  const [needWay, setNeedWay] = useState(false);
  /** Another window made a newer code: this one is closed. */
  const [replaced, setReplaced] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);

  const runChecks = useCallback(async (fresh = false) => {
    setChecking(true);
    try {
      const answer = await inboxApi.pairingChecks(fresh);
      setChecks(answer.checks);
      setChecksError(null);
    } catch (cause) {
      setChecksError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  // Each step's heading takes focus, so a keyboard or screen reader lands on what changed.
  useEffect(() => {
    heading.current?.focus({ preventScroll: firstStep.current });
    firstStep.current = false;
  }, [step]);

  const on = waysOn(lan, tailnet);
  const gateOpen = canShowCode(lan, tailnet);
  useEffect(() => {
    if (gateOpen) setNeedWay(false);
  }, [gateOpen]);

  // A ref, not state: two presses in one frame both see the state from before the first.
  const makingRef = useRef(false);
  const makeCode = async () => {
    if (makingRef.current) return;
    makingRef.current = true;
    setFlowError(null);
    setMaking(true);
    try {
      known.current = new Set((await readDevices()).map((d) => d.id));
      const made = await inboxApi.pairPhone();
      setOffer(made);
      setView(null);
      setReplaced(false);
      setNow(Date.now());
      setStep('scan');
    } catch (cause) {
      setFlowError(cause instanceof Error ? cause.message : '未能生成配对码。');
    } finally {
      makingRef.current = false;
      setMaking(false);
    }
  };

  const showCode = () => {
    // One code at a time (makeCode's guard): a second press while the first is being made would open a
    // second offer, and the answers could land out of order, showing a code the Inbox already closed.
    if (!gateOpen) {
      setNeedWay(true);
      return;
    }
    void makeCode();
  };

  // While the code shows: the countdown, what reached the door, and the phone that redeems it.
  useEffect(() => {
    if (step !== 'scan' || !offer) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = async () => {
      try {
        const [list, read] = await Promise.all([readDevices(), inboxApi.pairingOffer().catch(() => null)]);
        // The Inbox keeps one offer: another window's New code replaces this one. Its state and attempts are not ours.
        if (read) setReplaced(read.offer !== null && read.offer.expires_at !== offer.offer.expires_at);
        if (read) setView(read.offer && read.offer.expires_at === offer.offer.expires_at ? read.offer : null);
        const fresh = list.find((d) => !known.current?.has(d.id));
        known.current = new Set(list.map((d) => d.id));
        if (fresh) {
          setPaired({ name: fresh.name, via: read?.offer ? pairedVia(read.offer.attempts) : null });
          setStep('paired');
        }
      } catch {
        // The next poll tries again.
      }
    };
    const timer = setInterval(() => void poll(), PAIRED_POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(timer);
    };
  }, [step, offer, readDevices]);

  const network = checks?.wifi.network ?? null;
  const login = checks?.tailscale.login ?? null;
  const wifiLines = checks ? wifiCheckLines(checks.wifi) : [];
  const tailscaleLines = checks ? tailscaleCheckLines(checks.tailscale) : [];
  const neitherWorks = checks !== null && !gateOpen && hasFailure(wifiLines) && hasFailure(tailscaleLines);

  const steps: { id: Step; label: string }[] = [
    { id: 'reach', label: '连接方式' },
    { id: 'scan', label: '扫描' },
    { id: 'paired', label: '已配对' },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  const wayCard = (kind: 'wifi' | 'tailscale') => {
    const isWifi = kind === 'wifi';
    const state = isWifi ? lan : tailnet;
    const isOn = isWifi ? on.wifi : on.tailscale;
    const lines = isWifi ? wifiLines : tailscaleLines;
    const failing = hasFailure(lines);
    const address = state?.address ?? null;
    const working = isOn && address !== null && !state?.error;
    const title = isWifi ? '此 Wi-Fi' : 'Tailscale';
    // A switch changes what the checks can see (the mapping on 8443, the listener): read them again after it.
    const switchWay = async (next: boolean) => {
      await (isWifi ? onSwitchLan : onSwitchTailnet)(next);
      void runChecks(true);
    };
    return (
      <section className={`ib-way${isOn ? ' ib-is-on' : ''}`} data-pair-way={kind} data-way-on={isOn ? 'true' : 'false'} aria-labelledby={`ib-way-${kind}`}>
        <div className="ib-way-h">
          <span className="ib-tile">{isWifi ? <Icon name="wifi" /> : <TailscaleMark />}</span>
          <span className="ib-txt">
            <b id={`ib-way-${kind}`}>{title}</b>
            <span className="ib-why">
              {isWifi ? '只要手机与这台电脑在同一 Wi-Fi 下即可使用。' : '只要手机开着 Tailscale，在家或在外都能使用。'}
            </span>
          </span>
        </div>
        <div className="ib-way-sec">
          <h5>此电脑</h5>
          {checks ? <Checks lines={lines} /> : <p className="ib-mut">{checksError ? `检查项未能加载：${checksError}` : '检查中…'}</p>}
        </div>
        <div className="ib-way-sec">
          <h5>你的手机需要</h5>
          <Needs items={isWifi ? wifiPhoneNeeds(network) : tailscalePhoneNeeds(login)} />
        </div>
        <div className="ib-way-f">
          {isOn ? (
            <>
              <span className={`ib-chip ${working ? 'ib-chip-on' : 'ib-chip-err'}`} data-way-state={working ? 'on' : 'not-working'}>
                {working ? (
                  <>
                    <Icon name="check" size={12} /> On
                  </>
                ) : (
                  '无法使用'
                )}
              </span>
              <Tip content={working ? address : null} when={(trigger) => isTextCut(trigger) || isTextCut(trigger.querySelector('code'))}>
                <span className={`ib-way-addr${working ? '' : ' ib-way-err'}`}>
                  {working ? <code>{address}</code> : (state?.error ?? '尚不可达')}
                </span>
              </Tip>
              <span className="ib-way-btns">
                <button type="button" className="ib-btn ib-sm ib-ghost" disabled={busy} onClick={() => void switchWay(false)} aria-label={`Turn off ${title}`}>
                  Turn off
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="ib-way-addr">
                {failing ? '请先修复上面的项目，或仍然开启。' : isWifi ? '在此网络上开启加密监听' : '仅在你的 tailnet 上为手机发布收件箱'}
              </span>
              <span className="ib-way-btns">
                {failing && (
                  <button type="button" className="ib-btn ib-sm" disabled={checking} onClick={() => (onRefreshWays(), void runChecks(true))} data-check-again="">
                    <Icon name="refresh" size={14} /> Check again
                  </button>
                )}
                <button type="button" className="ib-btn ib-sm ib-pri" disabled={busy} onClick={() => void switchWay(true)} aria-label={`Turn on ${title}`} data-turn-on={kind}>
                  Turn on
                </button>
              </span>
            </>
          )}
        </div>
      </section>
    );
  };

  const left = offer ? Date.parse(offer.offer.expires_at) - now : 0;
  const expired = offer !== null && (replaced || left <= 0 || view?.state === 'expired' || view?.state === 'closed');
  const notes = view ? attemptNotes(view.attempts) : [];
  const seenNothing = expired && !replaced && (view?.attempts.length ?? 0) === 0;
  const closedByTries = view?.state === 'closed' && view.tries_left === 0;
  const tailnetAddress = offer?.addresses.tailnet ?? null;
  const lanAddress = offer?.addresses.lan && offer.addresses.fingerprint ? offer.addresses.lan : null;

  return (
    <div className="ib-flow" data-pair-flow="" data-pair-step={step}>
      <div className="ib-flow-head">
        <h3>配对手机</h3>
        <ol className="ib-steps" aria-label="步骤">
          {steps.map((s, i) => (
            <li key={s.id} aria-current={i === stepIndex ? 'step' : undefined} className={i < stepIndex ? 'ib-done' : undefined}>
              <span className="ib-n" aria-hidden="true">
                {i < stepIndex ? <Icon name="check" size={11} /> : i + 1}
              </span>
              {s.label}
              {i < stepIndex && <span className="ib-sr"> (done)</span>}
            </li>
          ))}
        </ol>
      </div>
      <div className="ib-flow-body">
        {step === 'reach' && (
          <>
            <h4 ref={heading} tabIndex={-1}>
              How will your phone reach this computer?
            </h4>
            <p className="ib-lead">
              The code you scan carries this computer&apos;s address, so turn on at least one way first. You can turn on both: the phone uses
              whichever works where it is.
            </p>
            <div className="ib-ways">
              {wayCard('wifi')}
              {wayCard('tailscale')}
            </div>
            {error && (
              <div className="ib-callout ib-err" role="alert">
                <Icon name="xCircle" /> <span>{error}</span>
              </div>
            )}
            {neitherWorks && (
              <div className="ib-callout ib-err" data-neither-works="">
                <Icon name="xCircle" />
                <span>
                  <b>这两种方式目前都无法从此电脑使用。</b> 请修复上面的某一项，然后再次检查。开启任一方式后才会显示配对码。
                </span>
              </div>
            )}
            <div className="ib-flow-f">
              <span className="ib-hint" role="status" data-pair-hint={needWay ? 'need-way' : on.wifi || on.tailscale ? 'ready' : 'none'}>
                {needWay ? '请先开启上方的「此 Wi-Fi」或「Tailscale」：配对码会携带你手机使用的地址。' : continueHint(on, network)}
              </span>
              <span className="ib-right">
                <button type="button" className="ib-btn ib-ghost" onClick={() => onClose(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`ib-btn ib-pri${gateOpen ? '' : ' ib-dim'}`}
                  aria-disabled={!gateOpen || making}
                  data-show-code=""
                  onClick={showCode}
                >
                  {gateOpen ? '继续查看配对码' : '显示配对码'}
                </button>
              </span>
            </div>
            {flowError && <div className="ib-error">{flowError}</div>}
            <p className="ib-later">
              <Icon name="globe" size={14} /> Away from home without Tailscale (through Plannotator&apos;s relay) is not available yet.
            </p>
          </>
        )}

        {step === 'scan' && offer && (
          <>
            <div className="ib-scan" data-pair-offer="" data-expired={expired ? 'true' : 'false'}>
              <div className={`ib-qr-wrap${expired ? ' ib-stale' : ''}`}>
                <QrCode link={offer.link} />
                {expired && <span className="ib-qr-over">{replaced ? '此配对码已被替换' : '此配对码已过期'}</span>}
              </div>
              <div className="ib-scan-t">
                <h4 ref={heading} tabIndex={-1}>
                  用 iPhone 上的 Plannotator 扫描
                </h4>
                {expired ? (
                  <p data-pair-closed={replaced ? 'replaced' : closedByTries ? 'tries' : 'expired'}>
                    {replaced
                      ? '另一个窗口生成了更新的配对码，因此此码已无法配对。请在此生成新码，或扫描那个窗口中的码。'
                      : closedByTries
                        ? '五次错误尝试后配对码已关闭。请生成新码重试。'
                        : seenNothing
                          ? '请生成新码重试。先检查下面的列表。'
                          : '请生成新码重试。'}
                  </p>
                ) : tailnetAddress ? (
                  <>
                    <p>或者在应用中输入配对码：</p>
                    <div className="ib-pair-code" data-pair-code={offer.offer.code} aria-label={`Pairing code ${offer.offer.code.split('').join(' ')}`}>
                      {offer.offer.code.slice(0, 3)} {offer.offer.code.slice(3)}
                    </div>
                  </>
                ) : lanAddress ? (
                  <p data-pair-scan-only="">通过 Wi-Fi 时，手机只能通过扫描配对。</p>
                ) : null}
                <div className="ib-reach">
                  {lanAddress && (
                    <span data-pair-address="wifi">
                      <Icon name="wifi" size={14} /> 此 Wi-Fi <code>{offer.addresses.lan}</code>
                    </span>
                  )}
                  {tailnetAddress && (
                    <span data-pair-address="tailscale">
                      <TailscaleMark size={14} /> Tailscale <code>{tailnetAddress}</code>
                    </span>
                  )}
                  <button type="button" className="ib-lnk" onClick={() => setStep('reach')} data-pair-change="">
                    Change
                  </button>
                </div>
                {offer.reachable === false && (
                  <div className="ib-callout ib-warn" data-pair-unreachable="">
                    <Icon name="warn" />
                    <span>
                      <b>此配对码不包含你手机当前可访问的地址。</b> {lan?.error ?? tailnet?.error ?? '你开启的方式无法使用。'} 请更改连接方式，
                      reaches this computer, then make a new code.
                    </span>
                  </div>
                )}
                {/* Only with an address to reach: never the heading over an empty list. */}
                {!expired && (lanAddress || tailnetAddress) && (
                  <div className="ib-before">
                    <h5>扫描前，请在手机上</h5>
                    <ul className="ib-checks">
                      {lanAddress && (
                        <li className="ib-ck-need">
                          <Icon name="wifi" size={14} />
                          <span>
                            Your iPhone is on {network ? `“${network}”` : 'the same Wi-Fi as this computer'}
                            {tailnetAddress ? ', or' : '.'}
                          </span>
                        </li>
                      )}
                      {tailnetAddress && (
                        <li className="ib-ck-need">
                          <TailscaleMark size={14} />
                          <span>Tailscale is on, signed in to the same tailnet{login ? ` (${login})` : ''}.</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <div role="status" className="ib-notes" data-pair-notes="">
                  {notes.map((note) => (
                    <div key={note.key} className="ib-callout ib-warn" data-pair-note={note.kind} data-via={note.via} data-tries-left={note.triesLeft}>
                      <Icon name="warn" />
                      <span>
                        <b>{note.title}</b> {note.text}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="ib-wait">
                  {expired ? (
                    <span>{replaced ? '已被更新的配对码替换。' : closedByTries ? '五次错误尝试后已关闭。' : '10 分钟后已过期。'}</span>
                  ) : (
                    <>
                      <span className="ib-spin" aria-hidden="true" />
                      <span data-pair-left="">Waiting for your phone · expires in {countdown(left)}</span>
                    </>
                  )}
                  <span className="ib-right">
                    <button type="button" className={`ib-btn ${expired ? 'ib-pri' : ''}`} aria-disabled={making} onClick={() => !making && void makeCode()} data-pair-new="">
                      New code
                    </button>
                    <button type="button" className="ib-btn ib-ghost" onClick={() => onClose(false)}>
                      Cancel
                    </button>
                  </span>
                </div>
                {flowError && <div className="ib-error">{flowError}</div>}
              </div>
            </div>
            {seenNothing && (
              <div className="ib-trouble" data-pair-trouble="">
                <h5>
                  <Icon name="excl" size={15} /> No phone reached this computer while the code showed
                </h5>
                <ol>
                  {troubleshooting({ wifi: lanAddress !== null, tailscale: tailnetAddress !== null }, network, login).map((item) => (
                    <li key={item.key}>
                      <b>{item.title}</b> <span className="ib-mut">{item.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {step === 'paired' && paired && (
          <div className="ib-done-big" data-pair-done="">
            <span className="ib-ok-ring">
              <Icon name="check" />
            </span>
            <div>
              <h4 ref={heading} tabIndex={-1}>
                已与 {paired.name} 配对
              </h4>
              <p>
                {paired.via === 'tailnet'
                  ? '它通过 Tailscale 连接到了此电脑，无论在家或在外。'
                  : paired.via === 'wifi'
                    ? `它通过${network ? `“${network}”` : '此 Wi-Fi'}连接到了此电脑。${on.tailscale ? ' 离开家时它会使用 Tailscale。' : ' 它只在此 Wi-Fi 上响应：开启 Tailscale 后即可在外访问收件箱。'}`
                    : '它通过自己的地址连接到了此电脑。'}
              </p>
              <button type="button" className="ib-btn ib-pri" onClick={() => onClose(true)} data-pair-finish="">
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
