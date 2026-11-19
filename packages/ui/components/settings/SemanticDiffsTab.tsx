// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
import React, { useCallback, useEffect, useState } from 'react';
import { configStore, useConfigValue } from '../../config';
import { AnalysisLayerToggle } from '../AnalysisLayerToggle';

type Provider = 'jev' | 'clef';
type Failure = 'missing' | 'refused' | 'noCredit' | 'noAnswer';
type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; ms: number } | { kind: 'error'; failure: Failure };

const ROUTE = '/api/sem-diff/opinion/settings';
export const POWER_UP_CHANGED_EVENT = 'plannotator:power-up-changed';
const PROVIDER_NAME: Record<Provider, string> = { jev: 'Jev', clef: 'Clef' };
const ADD_KEY: Record<Provider, string> = { jev: '粘贴你 TypeSafe 账户中的密钥', clef: '你的 Cloudflare 账户 ID 和 Workers AI 令牌' };

function failureText(provider: Provider, failure: Failure): string {
  const name = PROVIDER_NAME[provider];
  if (failure === 'missing') return provider === 'jev' ? '添加你的 TypeSafe 密钥' : '添加你的账户 ID 和令牌';
  if (failure === 'refused') return provider === 'jev' ? 'Jev 拒绝了此密钥' : 'Clef 拒绝了此令牌';
  if (failure === 'noCredit') return `此 ${name} 账户已无可用额度`;
  return `${name} 未响应。请稍后重试。`;
}

const KEY_MESSAGE_ID = 'power-up-key-message';

function KeyField({ caption, label, value, onChange, secret, flagged, message, saved, onFocus, className }: {
  caption?: string;
  message?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  secret: boolean;
  flagged: boolean;
  saved: boolean;
  onFocus: () => void;
  className: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      {caption && <span className="text-xs font-medium text-foreground">{caption}</span>}
      <input
        className={`h-7 w-full min-w-0 rounded-md border bg-background px-2 font-mono text-xs outline-none ${flagged ? 'border-warning ring-1 ring-warning focus:ring-2 focus:ring-warning' : 'border-border focus:ring-1 focus:ring-ring'}`}
        style={flagged ? { outlineColor: 'var(--warning)' } : undefined}
        type={secret ? 'password' : 'text'}
        autoComplete="off"
        spellCheck={false}
        placeholder={saved ? '••••••••' : ''}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-label={label}
        aria-invalid={flagged || undefined}
        aria-describedby={message ? KEY_MESSAGE_ID : undefined}
      />

    </label>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex items-center gap-px rounded-md bg-muted/60 p-px" role="radiogroup" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`rounded-[5px] px-2.5 py-1 text-xs ${value === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {hint && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function SemanticDiffsTab() {
  const semantic = useConfigValue('diffSemantic');
  const semanticDiffEnabled = useConfigValue('semanticDiffEnabled');
  const powerUp = useConfigValue('diffPowerUp');
  const motion = useConfigValue('diffPowerUpMotion');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(false);
  const [savedProvider, setSavedProvider] = useState<Provider | null>(null);
  const [provider, setProvider] = useState<Provider>('jev');
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [check, setCheck] = useState<Check>({ kind: 'idle' });

  const load = useCallback(async () => {
    try {
      const res = await fetch(ROUTE);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { configured: boolean; provider: Provider | null };
      setAvailable(true);
      setConfigured(data.configured);
      setSavedProvider(data.provider);
      if (data.provider) setProvider(data.provider);
      setEditing(!data.configured);
    } catch {
      setAvailable(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => window.dispatchEvent(new Event(POWER_UP_CHANGED_EVENT));

  const save = async () => {
    setCheck({ kind: 'checking' });
    const body = provider === 'jev' ? { provider, apiKey } : { provider, accountId, apiToken };
    try {
      const res = await fetch(ROUTE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const reply = (await res.json()) as { ok: true; ms: number } | { ok: false; failure?: Failure };
      setApiKey('');
      setApiToken('');
      if (reply.ok === false) {
        setCheck({ kind: 'error', failure: reply.failure ?? 'noAnswer' });
        return;
      }
      setCheck({ kind: 'ok', ms: reply.ms });
      setAccountId('');
      setSavedProvider(provider);
      setConfigured(true);
      setEditing(false);
      configStore.set('diffPowerUp', true);
      changed();
    } catch {
      setCheck({ kind: 'error', failure: 'noAnswer' });
    }
  };

  const remove = async () => {
    await fetch(ROUTE, { method: 'DELETE' }).catch(() => {});
    setConfigured(false);
    setSavedProvider(null);
    setEditing(true);
    setCheck({ kind: 'idle' });
    changed();
  };

  const saved = configured && savedProvider === provider && (!editing || (provider === 'jev' ? !apiKey : !accountId && !apiToken));
  const failure = check.kind === 'error' ? check.failure : null;
  const fieldMessage =
    failure === 'refused' || failure === 'noCredit'
      ? failureText(provider, failure)
      : failure === 'missing'
        ? provider === 'jev'
          ? 'Add your TypeSafe key'
          : !accountId
            ? '添加你的账户 ID'
            : '添加你的令牌'
        : null;
  const complete = provider === 'jev' ? apiKey.trim() !== '' : accountId.trim() !== '' && apiToken.trim() !== '';
  return (
    <div className="space-y-4" data-semantic-diffs-settings="">
      <div>
        <div className="text-sm font-semibold">语义差异</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">标明每个更改的真实性质：移动、重命名、重新格式化、提取。</p>
      </div>
      <AnalysisLayerToggle
        checked={semantic && semanticDiffEnabled}
        disabled={!semanticDiffEnabled}
        onChange={(on) => configStore.set('diffSemantic', on)}
        label="显示移动和重命名的代码"
        description={semanticDiffEnabled
          ? '将移动、重命名、重新格式化、提取和内联的代码按真实性质呈现。'
          : '当「设置 › 分析」中的语义变更关闭时不可用。'}
      />
      <div data-power-up-settings="">
        <div className="border-t border-border pt-3">
          <AnalysisLayerToggle
            checked={powerUp && configured}
            disabled={!configured || !semantic || !semanticDiffEnabled}
            onChange={(on) => {
              configStore.set('diffPowerUp', on);
              changed();
            }}
            label="增强"
            description={
              configured
                ? '由模型复核引擎无法自行标注的更改。开启后，每个语义差异都会经过这次复核。'
                : '由模型复核引擎无法自行标注的更改。在下方添加密钥即可开启。'
            }
          />
        </div>
        {available === false ? (
          <Row title="模型" hint="此审查宿主无法保存密钥。" />
        ) : (
          <>
            <Row
              title="模型"
              hint={
                configured && savedProvider && savedProvider !== provider
                  ? `在 ${provider === 'clef' ? 'Clef 令牌' : 'Jev 密钥'}可用之前，${PROVIDER_NAME[savedProvider]} 会继续负责增强。`
                  : provider === 'jev'
                    ? 'Jev 更快，每个文件约 0.2 秒。'
                    : 'Clef 运行在你的 Cloudflare 账户上。'
              }
            >
              <Segmented
                label="模型"
                value={provider}
                options={[['jev', 'Jev'], ['clef', 'Clef']]}
                onChange={(v) => {
                  setProvider(v);
                  setEditing(true);
                  setCheck({ kind: 'idle' });
                }}
              />
            </Row>
            <Row
              title={provider === 'jev' ? 'Jev 密钥' : 'Workers AI'}
              hint={
                check.kind === 'ok' ? (
                  `✓ 密钥可用 · ${check.ms} ms`
                ) : check.kind === 'error' && check.failure === 'noAnswer' ? (
                  <span className="text-warning" data-power-up-key-failure="noAnswer">{failureText(provider, check.failure)}</span>
                ) : check.kind === 'checking' ? (
                  '检查中…'
                ) : saved ? (
                  '已保存在本机'
                ) : (
                  ADD_KEY[provider]
                )
              }
            >
              <form
                className={`flex flex-col gap-1 ${provider === 'jev' ? 'w-[280px]' : 'w-[340px]'}`}
                data-power-up-key-set={saved ? '' : undefined}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (complete) void save();
                  else setCheck({ kind: 'error', failure: 'missing' });
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null) && complete && check.kind !== 'checking') void save();
                }}
              >
                <span className="flex items-start gap-1.5">
                  {provider === 'jev' ? (
                    <KeyField
                      className="w-full"
                      label="TypeSafe API 密钥"
                      value={apiKey}
                      onChange={setApiKey}
                      secret
                      flagged={failure === 'refused' || failure === 'noCredit' || (failure === 'missing' && !apiKey)}
                      message={failure === 'refused' || failure === 'noCredit' || (failure === 'missing' && !apiKey) ? failureText('jev', failure) : undefined}
                      saved={saved}
                      onFocus={() => setEditing(true)}
                    />
                  ) : (
                    <>
                      <KeyField
                        className="w-[96px] shrink-0"
                        caption="账户 ID"
                        label="Cloudflare 账户 ID"
                        value={accountId}
                        onChange={setAccountId}
                        secret={false}
                        flagged={failure === 'missing' && !accountId}
                        message={failure === 'missing' && !accountId ? '添加你的账户 ID' : undefined}
                        saved={saved}
                        onFocus={() => setEditing(true)}
                      />
                      <KeyField
                        className="min-w-0 flex-1"
                        caption="令牌"
                        label="Workers AI 令牌"
                        value={apiToken}
                        onChange={setApiToken}
                        secret
                        flagged={failure === 'refused' || failure === 'noCredit' || (failure === 'missing' && !apiToken)}
                        message={failure === 'refused' || failure === 'noCredit' ? failureText('clef', failure) : failure === 'missing' && !apiToken ? '添加你的令牌' : undefined}
                        saved={saved}
                        onFocus={() => setEditing(true)}
                      />
                    </>
                  )}
                  <span className="flex shrink-0 flex-col gap-1">
                    {provider === 'clef' && <span aria-hidden="true" className="invisible text-xs font-medium">Token</span>}
                    <button
                      type="submit"
                      className="h-7 shrink-0 whitespace-nowrap rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      disabled={check.kind === 'checking' || (saved && !complete)}
                      data-power-up-key-save=""
                    >
                      {check.kind === 'checking' ? '检查中…' : saved && !complete ? 'Saved' : 'Check and save'}
                    </button>
                  </span>
                  {saved && !complete && (
                    <button
                      type="button"
                      className="h-7 shrink-0 whitespace-nowrap rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => void remove()}
                      data-power-up-key-remove=""
                    >
                      Remove
                    </button>
                  )}
                </span>
                {fieldMessage && (
                  <span id={KEY_MESSAGE_ID} className="text-xs text-warning" data-power-up-key-failure="">
                    {fieldMessage}
                  </span>
                )}
              </form>
            </Row>
            <Row title="动效" hint="「流动」会让色带缓慢移动。这是实验性功能：可能影响滚动流畅度。两者都遵循系统的「减少动态效果」设置。">
              <Segmented label="动效" value={motion} options={[['still', '静止'], ['stream', '流动']]} onChange={(v) => configStore.set('diffPowerUpMotion', v)} />
            </Row>
            <p className="pt-1 text-xs text-muted-foreground">
              你的密钥、你的账户；代码会发送给 {PROVIDER_NAME[provider]}。只会发送引擎所询问的函数，绝不会发送仓库的其他内容。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
