import { useCallback, useEffect, useRef, useState } from 'react';
import { inboxApi, type LanState, type PairedDevice, type TailnetState, type TailscaleSettings } from '../api';
import { shortTime } from '../format';
import { Icon, TailscaleMark } from '../icons';
import { PairFlow } from './PairFlow';
import { Tip } from './Tip';
import { ThroughCloudflare } from './ThroughCloudflare';
import { Switch } from './SettingSwitch';

const PLATFORM: Record<string, string> = { ios: 'iPhone', android: 'Android' };

/** The certificate's SHA-256 in groups of four, for a person comparing it by eye. */
function grouped(hex: string): string {
  return hex.match(/.{1,4}/g)?.join(' ') ?? hex;
}

/**
 * Remove, asked twice like Delete thread: "Remove? Click again", then the
 * phone's token stops working. Its words, shown and spoken, are the phone
 * list's own and stay as they are; Settings → Machines' Unlink has its own
 * (UnlinkLink).
 */
function RemoveLink({ name, onRemove }: { name: string; onRemove: () => Promise<void> }) {
  return (
    <AskTwiceButton
      onRemove={onRemove}
      text="Remove"
      label={`Remove ${name}`}
      confirmText="Remove? Click again"
      confirmLabel={`移除 ${name}：再点一次即可移除`}
    />
  );
}

/**
 * Settings → Machines: Unlink, asked twice the same way. `warning`: what the
 * second click costs, said in the confirm itself (answers that will not be sent).
 */
export function UnlinkLink({ name, onRemove, warning }: { name: string; onRemove: () => Promise<void>; warning?: string }) {
  const confirmText = warning ? `解除关联？${warning} 请再点一次` : '解除关联？请再点一次';
  return (
    <AskTwiceButton
      onRemove={onRemove}
      text="Unlink"
      label={`Unlink ${name}`}
      confirmText={confirmText}
      confirmLabel={warning ? `解除关联 ${name}：${warning} 再点一次即可解除` : `解除关联 ${name}：再点一次即可解除`}
    />
  );
}

/** The button both ask with: the first click asks (for 4 s), the second acts. `label`/`confirmLabel`: what a screen reader says in each state. */
function AskTwiceButton({
  onRemove,
  text,
  label,
  confirmText,
  confirmLabel,
}: {
  onRemove: () => Promise<void>;
  text: string;
  label: string;
  confirmText: string;
  confirmLabel: string;
}) {
  const [state, setState] = useState<'idle' | 'confirm' | 'busy'>('idle');
  useEffect(() => {
    if (state !== 'confirm') return;
    const timer = setTimeout(() => setState('idle'), 4000);
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <button
      type="button"
      className={`ib-del-l${state === 'confirm' ? ' ib-confirm' : ''}`}
      disabled={state === 'busy'}
      aria-label={state === 'confirm' ? confirmLabel : label}
      onClick={() => {
        if (state === 'idle') return setState('confirm');
        if (state !== 'confirm') return;
        setState('busy');
        onRemove().finally(() => setState('idle'));
      }}
    >
      {state === 'confirm' ? confirmText : text}
    </button>
  );
}

export interface PhonesState {
  devices: PairedDevice[] | null;
  lan: LanState | null;
  tailnet: TailnetState | null;
  busy: boolean;
  error: string | null;
  readDevices: () => Promise<PairedDevice[]>;
  refreshWays: () => void;
  switchLan: (on: boolean) => Promise<boolean>;
  switchTailnet: (on: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  clearError: () => void;
}

/**
 * The phones' state for Settings: the paired phones and the two ways a phone
 * reaches this computer. Read while Settings is open (the nav's Devices dot
 * needs it on every section), only when the Inbox serves phones.
 */
export function usePhones(enabled: boolean): PhonesState {
  const [devices, setDevices] = useState<PairedDevice[] | null>(null);
  const [tailnet, setTailnet] = useState<TailnetState | null>(null);
  const [lan, setLan] = useState<LanState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readDevices = useCallback(async () => {
    const { devices: next } = await inboxApi.devices();
    setDevices(next);
    return next;
  }, []);

  const refreshWays = useCallback(() => {
    inboxApi
      .tailnet()
      .then(({ tailnet: state }) => setTailnet(state))
      .catch(() => {});
    inboxApi
      .lan()
      .then(({ lan: state }) => setLan(state))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    readDevices().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
    refreshWays();
  }, [enabled, readDevices, refreshWays]);

  const switchTailnet = async (on: boolean) => {
    setError(null);
    setBusy(true);
    try {
      const { tailnet: state } = await inboxApi.setTailnet(on);
      setTailnet(state);
      return true;
    } catch (cause) {
      // A refused turn on leaves the switch off; a refused turn off leaves it on (the Inbox kept it).
      if (on) setTailnet((current) => (current ? { ...current, on: false, address: null } : current));
      setError(cause instanceof Error ? cause.message : '开关未能保存。');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const switchLan = async (on: boolean) => {
    setError(null);
    setBusy(true);
    try {
      const { lan: state } = await inboxApi.setLan(on);
      setLan(state);
      return true;
    } catch (cause) {
      if (on) setLan((current) => (current ? { ...current, on: false, address: null, fingerprint: null, bonjour: false } : current));
      setError(cause instanceof Error ? cause.message : '开关未能保存。');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await inboxApi.removeDevice(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '未能移除该手机。');
    }
    await readDevices().catch(() => {});
  };

  return { devices, lan, tailnet, busy, error, readDevices, refreshWays, switchLan, switchTailnet, remove, clearError: () => setError(null) };
}

/** A way a phone reaches this computer, or Over your tailnet, is switched on and not working: the nav's Devices dot. */
export function devicesNeedAttention(phones: PhonesState | null, tailscale: TailscaleSettings | undefined): boolean {
  const way = (state: LanState | TailnetState | null) => state?.on === true && (state.error !== null || state.address === null);
  const browser = tailscale ? (tailscale.on && tailscale.error !== null) || (tailscale.exposed?.length ?? 0) > 0 : false;
  return way(phones?.lan ?? null) || way(phones?.tailnet ?? null) || browser;
}

/** A switch whose name is its row's visible title (label in name). */
/**
 * Over your tailnet, in Devices: the browser on your other devices, which
 * the phone app does not need (owner, decision 2: written out). One switch,
 * saved to config.json and applied at once. It shows the person's choice
 * even while publishing fails, so a click turns it off. It cannot be turned
 * on from a page that came through the tailnet, and the env var locks it.
 */
function OverYourTailnet({
  state,
  via,
  busy,
  onToggle,
}: {
  state: TailscaleSettings;
  via: 'local' | 'tailnet';
  busy: boolean;
  onToggle: (next: boolean, replaceExposed?: boolean) => void;
}) {
  const exposedPorts = (state.exposed ?? []).map((e) => e.https_port).filter((p): p is number => p !== null);
  const remote = via === 'tailnet';
  const who = state.allowed.length > 0 ? state.allowed.join(', ') : (state.owner ?? 'the Tailscale login that owns this computer');
  const logins = state.allowed.length > 1 ? state.allowed : null;
  const locked = state.env !== null;
  const exposed = (state.exposed?.length ?? 0) > 0;
  return (
    <section className="ib-sgroup" data-settings-tailscale={state.on ? 'on' : 'off'} aria-labelledby="ib-g-tailscale">
      <h2 id="ib-g-tailscale">通过你的 tailnet</h2>
      <p>
        Open the Inbox window in a browser on your laptop or tablet, through{' '}
        <a href="https://tailscale.com/" target="_blank" rel="noreferrer">
          Tailscale
        </a>
        , over HTTPS. Your phone&apos;s app does not need this.
      </p>
      <div className="ib-card">
        <div className="ib-prow">
          <span className="ib-tile">
            <TailscaleMark />
          </span>
          <span className="ib-txt">
            <span className="ib-l">
              <span id="ib-ts-label">通过 Tailscale 访问收件箱</span>
              {exposed && <span className="ib-chip ib-chip-warn">Exposed</span>}
              {state.on && state.error && !exposed && <span className="ib-chip ib-chip-err">无法工作</span>}
            </span>
            <span className="ib-desc" data-tailscale-url={state.url ?? ''}>
              {state.url ? (
                <>
                  On ·{' '}
                  <a href={state.url} target="_blank" rel="noreferrer">
                    {state.url}
                  </a>{' '}
                  · only {logins ? 'these logins' : who} can open it{logins ? ':' : ''}
                </>
              ) : state.on ? (
                '开启 · 未发布'
              ) : (
                `Off · only ${logins ? 'these logins' : who} could open it${logins ? ':' : ''}`
              )}
              {/* Several logins, one per line: never one long sentence of addresses. */}
              {logins && (state.url || !state.on) && (
                <span className="ib-logins" data-tailscale-logins="">
                  {logins.map((login) => (
                    <span key={login}>{login}</span>
                  ))}
                </span>
              )}
            </span>
          </span>
          <span className="ib-ctl">
            <Switch on={state.on} labelledBy="ib-ts-label" disabled={busy || locked} onClick={() => onToggle(!state.on)} />
          </span>
        </div>
        {exposed && (
          <div className="ib-callout ib-warn ib-in-card" data-tailscale-exposed="">
            <Icon name="warn" />
            <span>
              A tailscale serve mapping{exposedPorts.length ? ` on port ${exposedPorts.join(', ')}` : ''} points at the Inbox&apos;s own port. It exposes the whole
              Inbox, agent tools included, to everyone on your tailnet, so the Inbox refuses every request that comes through it.{' '}
              {!locked && (
                <button type="button" className="ib-lnk" data-tailscale-replace="" disabled={busy} onClick={() => onToggle(true, true)}>
                  Replace it with the owner-only address
                </button>
              )}
            </span>
          </div>
        )}
        {state.on && state.error && !exposed && (
          <div className="ib-callout ib-err ib-in-card" data-tailscale-error="">
            <Icon name="xCircle" />
            <span>{state.error}</span>
          </div>
        )}
      </div>
      <div className="ib-note">
        <Icon name="info" />
        {locked ? (
          `此收件箱的环境变量中设置了 PLANNOTATOR_INBOX_TAILSCALE，因此它保持${state.env ? '开启' : '关闭'}。`
        ) : remote && state.source !== 'flag' ? (
          '你是通过 tailnet 打开此页面的。关闭它会中断该连接；请再在这台电脑上重新开启。'
        ) : state.source === 'flag' ? (
          <span>
            On for this run (plannotator inbox --tailscale).{' '}
            <button type="button" className="ib-lnk" data-tailscale-keep="" disabled={busy} onClick={() => onToggle(true)}>
              Keep it on at every start
            </button>
          </span>
        ) : (
          '立即生效，且每次启动都生效。从那里发送的内容会成为这台电脑上智能体会话中的一轮。'
        )}
      </div>
    </section>
  );
}

/** One way a phone reaches this computer, as a row with its switch, address and, when not working, why. */
function WayRow({ kind, state, busy, onSwitch }: { kind: 'wifi' | 'tailscale'; state: LanState | TailnetState | null; busy: boolean; onSwitch: (on: boolean) => void }) {
  const isWifi = kind === 'wifi';
  const on = state?.on === true;
  const working = on && state!.address !== null && !state!.error;
  const lan = isWifi ? (state as LanState | null) : null;
  const id = `ib-way-row-${kind}`;
  return (
    <>
      <div className="ib-prow" data-lan={isWifi ? (on ? 'on' : 'off') : undefined} data-tailnet={isWifi ? undefined : on ? 'on' : 'off'}>
        <span className="ib-tile">{isWifi ? <Icon name="wifi" /> : <TailscaleMark />}</span>
        <span className="ib-txt">
          <span className="ib-l">
            <span id={id}>{isWifi ? '同一 Wi-Fi' : 'Tailscale'}</span>
            {on && !working && <span className="ib-chip ib-chip-err">无法工作</span>}
          </span>
          <span className="ib-desc" data-lan-address={isWifi ? (state?.address ?? '') : undefined} data-tailnet-address={isWifi ? undefined : (state?.address ?? '')}>
            {working ? (
              <>
                On · {state!.address}
                {lan?.fingerprint && (
                  <span data-lan-fingerprint={lan.fingerprint}>
                    {' '}
                    · certificate <Tip content={<span className="ib-tip-fp">{grouped(lan.fingerprint)}</span>}><span className="ib-sfp" data-fingerprint={grouped(lan.fingerprint)}>{grouped(lan.fingerprint).slice(0, 19)}…</span></Tip>
                  </span>
                )}
              </>
            ) : on ? (
              (state?.error ?? '尚不可访问')
            ) : isWifi ? (
              '关闭 · 同一 Wi-Fi 下的手机，经由它们校验的加密连接'
            ) : (
              '关闭 · 使用 Tailscale 的手机，无论在家还是在外，都无需将这台电脑暴露到互联网'
            )}
          </span>
        </span>
        <span className="ib-ctl">
          <Switch on={on} labelledBy={id} disabled={!state || busy} onClick={() => onSwitch(!on)} />
        </span>
      </div>
      {isWifi && working && lan && !lan.bonjour && (
        <div className="ib-callout ib-in-card" data-lan-no-bonjour="">
          <Icon name="info" />
          <span>Phones will not see this computer in their nearby list (no dns-sd or avahi-publish). Scanning the code still pairs them.</span>
        </div>
      )}
      {on && !working && state?.error && (
        <div className="ib-callout ib-err ib-in-card">
          <Icon name="xCircle" />
          <span>该开关会保持开启，这样一次点击即可关闭。将其关闭再打开可再试一次。</span>
        </div>
      )}
    </>
  );
}

export interface DevicesSectionProps {
  /** Null: this Inbox does not serve phones (PLANNOTATOR_INBOX_PHONES off), so Devices shows Over your tailnet only. */
  phones: PhonesState | null;
  tailscale: TailscaleSettings | undefined;
  via: 'local' | 'tailnet';
  tailscaleBusy: boolean;
  onToggleTailscale: (next: boolean, replaceExposed?: boolean) => void;
  /** `#settings/devices/pair`: Pair a phone is open. */
  pairing: boolean;
  onPairing: (open: boolean) => void;
}

/**
 * Devices (design of record `.product/approved/inbox-settings-tabs/`):
 * phones, how a phone reaches this computer (This Wi-Fi, Tailscale), and
 * Over your tailnet for browsers on other devices, the difference written
 * out (owner, decision 2).
 */
export function DevicesSection({ phones, tailscale, via, tailscaleBusy, onToggleTailscale, pairing, onPairing }: DevicesSectionProps) {
  // The owner pairs and switches from this computer or any of their own devices over the tailnet (owner ruling 2026-11-11).
  const pairButton = useRef<HTMLButtonElement>(null);
  const [justPaired, setJustPaired] = useState(false);
  const wasPairing = useRef(pairing);
  // Leaving the flow puts focus back on the button that opened it.
  useEffect(() => {
    if (wasPairing.current && !pairing) pairButton.current?.focus();
    wasPairing.current = pairing;
  }, [pairing]);
  const devices = phones?.devices ?? [];
  return (
    <>
      {phones && (
        <>
          <section className="ib-sgroup" data-settings-phones="" aria-labelledby="ib-g-phones">
            <h2 id="ib-g-phones">手机</h2>
            <p>在手机上用 Plannotator 阅读并回复收件箱。每台手机各有自己的密钥，移除即收回。</p>
            {pairing ? (
              <PairFlow
                lan={phones.lan}
                tailnet={phones.tailnet}
                busy={phones.busy}
                error={phones.error}
                onSwitchLan={phones.switchLan}
                onSwitchTailnet={phones.switchTailnet}
                onRefreshWays={phones.refreshWays}
                readDevices={phones.readDevices}
                onClose={(paired) => {
                  phones.clearError();
                  setJustPaired(paired);
                  onPairing(false);
                }}
              />
            ) : (
              <div className="ib-card" aria-label="已配对的手机">
                {devices.map((device) => (
                  <div className="ib-prow" key={device.id} data-device={device.id}>
                    <span className="ib-tile">
                      <Icon name="phone" />
                    </span>
                    <span className="ib-txt">
                      <span className="ib-l">{device.name}</span>
                      <span className="ib-desc">
                        {PLATFORM[device.platform] ?? device.platform} · last seen {shortTime(device.last_seen_at)}
                      </span>
                    </span>
                    <span className="ib-ctl">
                      <RemoveLink name={device.name} onRemove={() => phones.remove(device.id)} />
                    </span>
                  </div>
                ))}
                <div className="ib-prow">
                  <span className="ib-txt">
                    <span className="ib-l">{devices.length > 0 ? '再配对一台手机' : '尚未配对手机'}</span>
                    {devices.length === 0 && <span className="ib-desc">配对一台手机，即可在手机上阅读和回复。</span>}
                    {justPaired && (
                      <span className="ib-desc ib-paired" data-paired="" role="status">
                        <Icon name="check" size={13} /> Paired with {devices[0]?.name ?? '你的手机'}.
                      </span>
                    )}
                  </span>
                  <span className="ib-ctl">
                    <button
                      ref={pairButton}
                      type="button"
                      className={`ib-btn${devices.length === 0 ? ' ib-pri' : ''}`}
                      onClick={() => {
                        setJustPaired(false);
                        onPairing(true);
                      }}
                      data-pair-start=""
                    >
                      Pair a phone
                    </button>
                  </span>
                </div>
              </div>
            )}
            {phones.error && !pairing && (
              <div className="ib-callout ib-err" role="alert">
                <Icon name="xCircle" />
                <span>{phones.error}</span>
              </div>
            )}
          </section>
          {/* While pairing, step 1 holds the two ways and their switches: one thing in one place. */}
          {!pairing && (
          <section className="ib-sgroup" data-settings-ways="" aria-labelledby="ib-g-ways">
            <h2 id="ib-g-ways">手机如何连接到这台电脑</h2>
            <p>开启其中一个或两个。手机会使用在其所在位置可用的那个。</p>
            <div className="ib-card">
              <WayRow kind="wifi" state={phones.lan} busy={phones.busy} onSwitch={(on) => void phones.switchLan(on)} />
              <WayRow kind="tailscale" state={phones.tailnet} busy={phones.busy} onSwitch={(on) => void phones.switchTailnet(on)} />
            </div>
          </section>
          )}
        </>
      )}
      {tailscale && <OverYourTailnet state={tailscale} via={via} busy={tailscaleBusy} onToggle={onToggleTailscale} />}
      <ThroughCloudflare />
    </>
  );
}
