/**
 * Settings → Rows' controls as data (approval "inbox-rows-settings-page", 2026-11-10): each control's words, the
 * options it reads (`get`) and the change one of its choices makes (`set`), the four looks to start from, and the
 * words of a change ("Spacing → Compact"). No DOM here: the page (components/RowsSettings.tsx) draws these, and
 * rowsControls.test.ts proves over them that every stored look reads into the controls and writes back the same.
 *
 * The controls add no rule of their own. A choice is a change handed to `lookWithChange` (listLook.ts), which settles
 * rivals exactly as before, and the stored names are core's (`INBOX_ROWS_OPTIONS`), unchanged but for `hidePulls`.
 */
import { LIST_LOOK_DEFAULT, LIST_LOOK_KEYS, LIST_LOOK_OFF, lookMarks, lookWithChange, markStyleLook, marksWhatLook, type ListLook, type ListLookKey, type MarkStyle, type MarksWhat } from './listLook';

export type RowsControlId = 'spacing' | 'preview' | 'first' | 'time' | 'needs' | 'agents' | 'project' | 'pulls' | 'newer' | 'boldAll' | 'pill' | 'dividers' | 'timeAt' | 'badges' | 'shape' | 'logo' | 'github';

/** A control's value: a segmented choice's id, a switch's on or off, or null for a choice with none picked. */
export type RowsControlValue = string | boolean | null;

interface ControlBase {
  id: RowsControlId;
  label: string;
  /** Words under the label: only what the list cannot show, or a side effect of the look as it stands. */
  desc?: (look: ListLook) => string | undefined;
  /** The stored options this control reads and writes; no other control touches them (the picture switches aside). */
  keys: readonly ListLookKey[];
}
export interface RowsSegControl extends ControlBase {
  kind: 'seg';
  choices: readonly { id: string; label: string }[];
  get: (look: ListLook) => string | null;
  set: (value: string, look: ListLook) => Partial<ListLook>;
}
export interface RowsSwitchControl extends ControlBase {
  kind: 'switch';
  get: (look: ListLook) => boolean;
  set: (on: boolean, look: ListLook) => Partial<ListLook>;
}
export type RowsControl = RowsSegControl | RowsSwitchControl;

const seg = (control: Omit<RowsSegControl, 'kind'>): RowsSegControl => ({ kind: 'seg', ...control });
/** A switch that is on while its option is. */
const onSwitch = (id: RowsControlId, key: ListLookKey, label: string, desc?: string): RowsSwitchControl => ({ kind: 'switch', id, label, keys: [key], desc: desc ? () => desc : undefined, get: (look) => look[key], set: (on) => ({ [key]: on }) });
/** A switch that shows a part: on while its `hide…` option is off. */
const showSwitch = (id: RowsControlId, key: ListLookKey, label: string, desc?: string): RowsSwitchControl => ({ kind: 'switch', id, label, keys: [key], desc: desc ? () => desc : undefined, get: (look) => !look[key], set: (on) => ({ [key]: !on }) });

/** The first screen: eight choices over ten options. */
export const ROWS_MAIN_CONTROLS: readonly RowsControl[] = [
  seg({
    id: 'spacing',
    label: '间距',
    keys: ['compact', 'roomy'],
    desc: (look) => (look.compact ? '项目和名称共用第一行' : undefined),
    choices: [
      { id: 'compact', label: '紧凑' },
      { id: 'comfortable', label: '舒适' },
      { id: 'roomy', label: '宽松' },
    ],
    get: (look) => (look.compact ? 'compact' : look.roomy ? 'roomy' : 'comfortable'),
    set: (value) => ({ compact: value === 'compact', roomy: value === 'roomy' }),
  }),
  seg({
    id: 'preview',
    label: '名称下方的灰色行',
    keys: ['hidePreview', 'previewTwo'],
    choices: [
      { id: 'none', label: '无' },
      { id: 'one', label: '1 行' },
      { id: 'two', label: '2 行' },
    ],
    get: (look) => (look.hidePreview ? 'none' : look.previewTwo ? 'two' : 'one'),
    set: (value) => ({ hidePreview: value === 'none', previewTwo: value === 'two' }),
  }),
  seg({
    id: 'first',
    label: '行首内容',
    keys: ['titleFirst'],
    choices: [
      { id: 'project', label: '项目' },
      { id: 'name', label: '话题名称' },
    ],
    get: (look) => (look.titleFirst ? 'name' : 'project'),
    set: (value) => ({ titleFirst: value === 'name' }),
  }),
  seg({
    id: 'time',
    label: '时间',
    keys: ['relativeTime'],
    choices: [
      { id: 'clock', label: '9:12' },
      { id: 'relative', label: '10 分钟前' },
    ],
    get: (look) => (look.relativeTime ? 'relative' : 'clock'),
    set: (value) => ({ relativeTime: value === 'relative' }),
  }),
  seg({
    id: 'needs',
    label: '话题需要你处理时',
    keys: ['statusMark'],
    choices: [
      { id: 'count', label: '问题数量' },
      { id: 'mark', label: '一个标记' },
    ],
    get: (look) => (look.statusMark ? 'mark' : 'count'),
    set: (value) => ({ statusMark: value === 'mark' }),
  }),
  // Agent icons (approval "inbox-generated-agent-icons"): once a switch (show or hide), now one three-way choice.
  // "From the project name" also changes the Agents list and threads; a face picked for one agent stays.
  seg({
    id: 'agents',
    label: '智能体图标',
    keys: ['hideAgents', 'agentProjectIcons'],
    desc: (look) => (look.agentProjectIcons && !look.hideAgents ? '也会影响智能体列表和话题。为某个智能体单独选定的图标保持不变。' : undefined),
    choices: [
      { id: 'own', label: '各智能体自己的' },
      { id: 'project', label: '取自项目名称' },
      { id: 'hidden', label: '隐藏' },
    ],
    get: (look) => (look.hideAgents ? 'hidden' : look.agentProjectIcons ? 'project' : 'own'),
    set: (value) => ({ hideAgents: value === 'hidden', agentProjectIcons: value === 'project' }),
  }),
  showSwitch('project', 'hideProject', '项目名称'),
  showSwitch('pulls', 'hidePulls', 'PR', '行末显示其状态'),
];

/** Under "More choices": nine choices over the other twelve options. */
export const ROWS_MORE_CONTROLS: readonly RowsControl[] = [
  seg({
    id: 'newer',
    label: '新话题',
    keys: ['smallNames', 'unreadDot'],
    choices: [
      { id: 'larger', label: '更大的名称' },
      { id: 'bold', label: '加粗名称' },
      { id: 'dot', label: '圆点' },
    ],
    get: (look) => (look.unreadDot ? 'dot' : look.smallNames ? 'bold' : 'larger'),
    set: (value) => ({ smallNames: value !== 'larger', unreadDot: value === 'dot' }),
  }),
  onSwitch('boldAll', 'boldNames', '所有话题名称加粗', '已读的也加粗'),
  onSwitch('pill', 'highlight', '话题名称放在灰色胶囊中'),
  onSwitch('dividers', 'dividers', '行间分隔线'),
  seg({
    id: 'timeAt',
    label: '时间位置',
    keys: ['timeBelow'],
    desc: (look) => (look.compact ? '仅对非紧凑行生效' : undefined),
    choices: [
      { id: 'top', label: '右上角' },
      { id: 'below', label: '行下方' },
    ],
    get: (look) => (look.timeBelow ? 'below' : 'top'),
    set: (value) => ({ timeBelow: value === 'below' }),
  }),
  seg({
    id: 'badges',
    label: '字母徽标',
    keys: ['marksThreads', 'marksProjects'],
    choices: [
      { id: 'off', label: '关' },
      { id: 'threads', label: '话题' },
      { id: 'projects', label: '项目' },
      { id: 'both', label: '两者' },
    ],
    get: (look) => lookMarks(look).what,
    set: (value) => marksWhatLook(value as MarksWhat),
  }),
  // Nothing is picked while badges are off (core drops the shape then); picking one turns thread badges on.
  seg({
    id: 'shape',
    label: '徽标形状',
    keys: ['markInline', 'markDot'],
    desc: (look) => (lookMarks(look).what === 'off' ? '选择一个会开启话题徽标' : undefined),
    choices: [
      { id: 'avatar', label: '大徽标，位于左侧' },
      { id: 'inline', label: '小徽标，位于行内' },
      { id: 'dot', label: '圆点' },
    ],
    get: (look) => (lookMarks(look).what === 'off' ? null : lookMarks(look).style),
    set: (value, look) => markStyleLook(value as MarkStyle, look),
  }),
  onSwitch('logo', 'repoLogo', '项目徽标上的仓库 logo', '仅保存在本机'),
  onSwitch('github', 'githubPictures', '项目徽标上的 GitHub 头像', '每周向 GitHub 请求一次'),
];

export const ROWS_CONTROLS: readonly RowsControl[] = [...ROWS_MAIN_CONTROLS, ...ROWS_MORE_CONTROLS];

/** The look after one choice on the page: the control's change, rivals settled by `lookWithChange` as ever. */
export function lookWithChoice(look: ListLook, control: RowsControl, value: string | boolean): ListLook {
  return lookWithChange(look, control.kind === 'switch' ? control.set(value === true, look) : control.set(String(value), look));
}

/** Every control's value for a look: what the page shows as picked. */
export function rowsControlValues(look: ListLook): Record<RowsControlId, RowsControlValue> {
  return Object.fromEntries(ROWS_CONTROLS.map((control) => [control.id, control.get(look)])) as Record<RowsControlId, RowsControlValue>;
}

/** The look a set of control values makes, each applied as a click on its control would (null: none picked, no click). */
export function lookFromControlValues(values: Readonly<Record<RowsControlId, RowsControlValue>>): ListLook {
  let look = LIST_LOOK_OFF;
  for (const control of ROWS_CONTROLS) {
    const value = values[control.id];
    if (value !== null) look = lookWithChoice(look, control, value);
  }
  return look;
}

export type RowsPreset = 'balanced' | 'dense' | 'minimal' | 'detailed';

/**
 * The looks to start from, each whole. Balanced is the defaults. Minimal and Detailed are exactly what they were
 * before this page (approvals "inbox-rows-dialog" and "inbox-letter-marks"). Dense is new with it: two lines a row,
 * relative times, lines between rows and one mark for a thread that needs you. A look that matches none has none
 * pressed.
 */
export const ROWS_PRESETS: readonly { id: RowsPreset; label: string; look: ListLook }[] = [
  { id: 'balanced', label: '均衡', look: LIST_LOOK_DEFAULT },
  { id: 'dense', label: '紧凑', look: { ...LIST_LOOK_OFF, compact: true, smallNames: true, relativeTime: true, dividers: true, statusMark: true } },
  // Minimal (approval "inbox-rows-dialog", round 7b): the two-line title-first row, no preview, no dot, clock times.
  { id: 'minimal', label: '极简', look: { ...LIST_LOOK_OFF, titleFirst: true, hidePreview: true, smallNames: true } },
  // Detailed (approval "inbox-letter-marks"): letter badges on, both kinds as the big one, the repo's logo on.
  { id: 'detailed', label: '详细', look: { ...LIST_LOOK_OFF, roomy: true, previewTwo: true, marksThreads: true, marksProjects: true, repoLogo: true } },
];

export function rowsPreset(look: ListLook): RowsPreset | null {
  return ROWS_PRESETS.find((preset) => LIST_LOOK_KEYS.every((key) => preset.look[key] === look[key]))?.id ?? null;
}

/** A control's value in the change line's words: a choice's label, "on" or "off". */
function valueWords(control: RowsControl, look: ListLook): string {
  if (control.kind === 'switch') return control.get(look) ? 'on' : 'off';
  const value = control.get(look);
  return control.choices.find((choice) => choice.id === value)?.label ?? 'off';
}

/** The controls whose value differs between two looks, in the page's order. */
export function rowsChangedControls(before: ListLook, after: ListLook): RowsControl[] {
  return ROWS_CONTROLS.filter((control) => control.get(before) !== control.get(after));
}

/** A change in the page's words, one part per control that moved: "Spacing → Compact". */
export function rowsChangeWords(before: ListLook, after: ListLook): string[] {
  return rowsChangedControls(before, after).map((control) => `${control.label} → ${valueWords(control, after)}`);
}
