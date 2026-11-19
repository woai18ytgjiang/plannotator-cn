// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * "Tell your agent" for Settings → Rows (approval "inbox-rows-settings-page"): the one place for every word an agent
 * reads about the Inbox list's rows. The instruction block a Rows ask carries, the setting names and values an agent
 * can use, what `plannotator inbox rows` / `rows set` / `rows undo` print, and their help text all live here, so an
 * edit of the owner's is one line in this file. The record of the approved words is
 * `.product/approved/inbox-rows-settings-page/`; they change only with the owner.
 *
 * The rules are core's own: a value is a change over the stored option names (`INBOX_ROWS_OPTIONS`), settled by
 * `inboxRowsCanonical`, exactly as a click on the page (packages/inbox/rowsControls.ts; rowsWords.test.ts holds the
 * two together).
 */
// inbox-types.ts re-exports this file (core adds no export of its own for it: a new one needs a published core), so the
// two import each other: nothing of inbox-types is read while this file loads, only inside functions.
import { inboxRowsCanonical, type InboxRowsOption } from "./inbox-types";

/** The markers around what an agent receives with an ask from Settings → Rows, each on its own line. */
export const INBOX_ROWS_ASK_OPEN = "<plannotator-rows-ask>";
export const INBOX_ROWS_ASK_CLOSE = "</plannotator-rows-ask>";

/** What the agent receives after the person's words when they ask from Settings → Rows. Goes out only with that ask. */
export const INBOX_ROWS_ASK_BLOCK = [
  INBOX_ROWS_ASK_OPEN,
  "The person asked this from Settings > Rows in the Inbox. They want the rows of their thread list to look different. Do only that.",
  "- First reply in this thread, in one line, that you are on it.",
  "- Run `plannotator inbox rows`. It prints every row option, what it changes and its value now.",
  "- Change the options that do what they asked, in one command: `plannotator inbox rows set <name>=<value> ...`. Change nothing else: no files, no config.json, no other setting.",
  "- If part of what they asked has no row option (a colour, a font, text size, a new column), say so and leave it. Do not work around it.",
  "- If two options would give clearly different lists and you can't tell which they mean, ask them, and change nothing until they answer.",
  "- Then reply here with what changed, in the words the command printed, and say that Undo is on the Rows page. If the command failed, quote its error and say that nothing changed.",
  INBOX_ROWS_ASK_CLOSE,
].join("\n");

type On = ReadonlySet<InboxRowsOption>;
type Change = Partial<Record<InboxRowsOption, boolean>>;

export interface InboxRowsSetting {
  /** The name an agent writes: `spacing`. */
  name: string;
  /** The page's label: "Spacing". */
  label: string;
  /** Each value an agent can write, with the page's word for it. */
  values: readonly { value: string; label: string }[];
  /** What it changes, for the listing. */
  changes: string;
  /** The value now; null for a choice with none picked (Badge shape while badges are off). */
  get: (on: On) => string | null;
  /** The options a value turns on and off. */
  set: (value: string, on: On) => Change;
}

const ON_OFF = [
  { value: "on", label: "开" },
  { value: "off", label: "关" },
] as const;
/** A switch that is on while its option is. */
const onSetting = (name: string, key: InboxRowsOption, label: string, changes: string): InboxRowsSetting => ({ name, label, values: ON_OFF, changes, get: (on) => (on.has(key) ? "on" : "off"), set: (value) => ({ [key]: value === "on" }) });
/** A switch that shows a part: on while its `hide…` option is off. */
const showSetting = (name: string, key: InboxRowsOption, label: string, changes: string): InboxRowsSetting => ({ name, label, values: ON_OFF, changes, get: (on) => (on.has(key) ? "off" : "on"), set: (value) => ({ [key]: value !== "on" }) });
const badges = (on: On) => (on.has("marksThreads") ? (on.has("marksProjects") ? "both" : "threads") : on.has("marksProjects") ? "projects" : "off");

/** Every row option an agent can set, in the page's order. */
export const INBOX_ROWS_SETTINGS: readonly InboxRowsSetting[] = [
  {
    name: "spacing",
    label: "间距",
    values: [
      { value: "compact", label: "紧凑" },
      { value: "comfortable", label: "舒适" },
      { value: "roomy", label: "宽松" },
    ],
    changes: "Room around each row. compact: project and name share the first line.",
    get: (on) => (on.has("compact") ? "compact" : on.has("roomy") ? "roomy" : "comfortable"),
    set: (value) => ({ compact: value === "compact", roomy: value === "roomy" }),
  },
  {
    name: "grey-line",
    label: "名称下方的灰色行",
    values: [
      { value: "none", label: "无" },
      { value: "1", label: "1 行" },
      { value: "2", label: "2 行" },
    ],
    changes: "Lines of the latest message under a thread's name.",
    get: (on) => (on.has("hidePreview") ? "none" : on.has("previewTwo") ? "2" : "1"),
    set: (value) => ({ hidePreview: value === "none", previewTwo: value === "2" }),
  },
  {
    name: "first",
    label: "行首内容",
    values: [
      { value: "project", label: "项目" },
      { value: "name", label: "话题名称" },
    ],
    changes: "What the row starts with.",
    get: (on) => (on.has("titleFirst") ? "name" : "project"),
    set: (value) => ({ titleFirst: value === "name" }),
  },
  {
    name: "time",
    label: "时间",
    values: [
      { value: "clock", label: "9:12" },
      { value: "ago", label: "10 分钟前" },
    ],
    changes: "9:12 PM, or 10m.",
    get: (on) => (on.has("relativeTime") ? "ago" : "clock"),
    set: (value) => ({ relativeTime: value === "ago" }),
  },
  {
    name: "needs-you",
    label: "话题需要你处理时",
    values: [
      { value: "count", label: "问题数量" },
      { value: "mark", label: "一个标记" },
    ],
    changes: "The question count, or one mark, when a thread needs the person.",
    get: (on) => (on.has("statusMark") ? "mark" : "count"),
    set: (value) => ({ statusMark: value === "mark" }),
  },
  {
    // `on` and `off` are the values from when this was a switch, kept so a command written then still works.
    name: "agent-icons",
    label: "智能体图标",
    values: [
      { value: "on", label: "各智能体自己的" },
      { value: "project", label: "取自项目名称" },
      { value: "off", label: "隐藏" },
    ],
    changes: "The agents' icons. on: each agent's own mark. project: a tile from the project's name (also the Agents list and threads; an icon picked for one agent stays). off: none on rows.",
    get: (on) => (on.has("hideAgents") ? "off" : on.has("agentProjectIcons") ? "project" : "on"),
    set: (value) => ({ hideAgents: value === "off", agentProjectIcons: value === "project" }),
  },
  showSetting("project-name", "hideProject", "项目名称", "The project's name on each row."),
  showSetting("pull-requests", "hidePulls", "PR", "A pull request's state at the end of the row."),
  {
    name: "new-threads",
    label: "新话题",
    values: [
      { value: "bigger", label: "更大的名称" },
      { value: "bold", label: "加粗名称" },
      { value: "dot", label: "圆点" },
    ],
    changes: "How an unread thread stands out.",
    get: (on) => (on.has("unreadDot") ? "dot" : on.has("smallNames") ? "bold" : "bigger"),
    set: (value) => ({ smallNames: value !== "bigger", unreadDot: value === "dot" }),
  },
  onSetting("bold-names", "boldNames", "所有话题名称加粗", "Every thread name in bold, read ones too."),
  onSetting("name-pill", "highlight", "话题名称放在灰色胶囊中", "The thread name in a grey pill."),
  onSetting("row-lines", "dividers", "行间分隔线", "A line between rows."),
  {
    name: "time-place",
    label: "时间位置",
    values: [
      { value: "top", label: "右上角" },
      { value: "under", label: "行下方" },
    ],
    changes: "The time at the top right, or under the row. Not on compact rows.",
    get: (on) => (on.has("timeBelow") ? "under" : "top"),
    set: (value) => ({ timeBelow: value === "under" }),
  },
  {
    name: "letter-badges",
    label: "字母徽标",
    values: [
      { value: "off", label: "关" },
      { value: "threads", label: "话题" },
      { value: "projects", label: "项目" },
      { value: "both", label: "两者" },
    ],
    changes: "Coloured letter badges.",
    get: badges,
    set: (value) => ({ marksThreads: value === "threads" || value === "both", marksProjects: value === "projects" || value === "both" }),
  },
  {
    name: "badge-shape",
    label: "徽标形状",
    values: [
      { value: "big", label: "大徽标，位于左侧" },
      { value: "small", label: "小徽标，位于行内" },
      { value: "dot", label: "圆点" },
    ],
    changes: "The badge: big at the left, small in the line, or a dot. Picking one turns thread badges on.",
    get: (on) => (badges(on) === "off" ? null : on.has("markInline") ? "small" : on.has("markDot") ? "dot" : "big"),
    set: (value, on) => ({ markInline: value === "small", markDot: value === "dot", ...(badges(on) === "off" ? { marksThreads: true } : {}) }),
  },
  onSetting("repo-logo", "repoLogo", "项目徽标上的仓库 logo", "The repo's logo on project badges. Turns project badges on."),
  onSetting("github-pictures", "githubPictures", "项目徽标上的 GitHub 头像", "The GitHub owner's picture on project badges. Turns project badges on."),
];

/** The whole looks (`look=`): the page's "Start from". */
export const INBOX_ROWS_LOOKS: readonly { value: string; label: string; rows: readonly InboxRowsOption[] }[] = [
  // The defaults (`INBOX_ROWS_DEFAULT`), written out for the reason above; rowsWords.test.ts holds them equal.
  { value: "balanced", label: "均衡", rows: ["smallNames"] },
  { value: "dense", label: "紧凑", rows: ["compact", "smallNames", "relativeTime", "dividers", "statusMark"] },
  { value: "minimal", label: "极简", rows: ["smallNames", "hidePreview", "titleFirst"] },
  { value: "detailed", label: "详细", rows: ["roomy", "previewTwo", "marksThreads", "marksProjects", "repoLogo"] },
];
export const INBOX_ROWS_LOOK_NAME = "look";
const LOOK_CHANGES = "A whole look: sets every option above at once.";

/** A change on top of a look, the option just turned on winning over its rival (the page's `lookWithChange`). */
export function inboxRowsWithChange(rows: readonly InboxRowsOption[], change: Change): InboxRowsOption[] {
  const on = new Set(rows);
  for (const [key, value] of Object.entries(change) as [InboxRowsOption, boolean][]) {
    if (value) on.add(key);
    else on.delete(key);
  }
  if (change.compact) on.delete("roomy");
  if (change.roomy) on.delete("compact");
  if (change.hidePreview) on.delete("previewTwo");
  if (change.previewTwo) on.delete("hidePreview");
  if (change.unreadDot) on.add("smallNames");
  if (change.smallNames === false) on.delete("unreadDot");
  if (change.markInline) on.delete("markDot");
  if (change.markDot) on.delete("markInline");
  if (change.agentProjectIcons) on.delete("hideAgents");
  if (change.repoLogo || change.githubPictures) on.add("marksProjects");
  return inboxRowsCanonical([...on]);
}

/** The look's name for a list of options, or null when it matches none. */
export function inboxRowsLookOf(rows: readonly InboxRowsOption[]): string | null {
  const key = inboxRowsCanonical(rows).join();
  return INBOX_ROWS_LOOKS.find((look) => inboxRowsCanonical(look.rows).join() === key)?.value ?? null;
}

const quoted = (values: readonly { value: string }[]) => {
  const names = values.map((entry) => entry.value);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : (names[0] ?? "");
};

/**
 * `rows set`'s pairs applied to a look: `look=` first, then each option in the order given, one result for one save.
 * Any pair refused refuses them all.
 */
export function inboxRowsApply(rows: readonly InboxRowsOption[], pairs: readonly string[]): { rows: InboxRowsOption[] } | { error: string } {
  const seen = new Set<string>();
  const parsed: { name: string; value: string }[] = [];
  for (const pair of pairs) {
    const at = pair.indexOf("=");
    const name = at > 0 ? pair.slice(0, at) : pair;
    const value = at > 0 ? pair.slice(at + 1) : "";
    const setting = name === INBOX_ROWS_LOOK_NAME ? { values: INBOX_ROWS_LOOKS } : INBOX_ROWS_SETTINGS.find((entry) => entry.name === name);
    if (!setting) return { error: INBOX_ROWS_WORDS.unknownName(name) };
    if (!setting.values.some((entry) => entry.value === value)) return { error: INBOX_ROWS_WORDS.badValue(name, quoted(setting.values), value) };
    if (seen.has(name)) return { error: INBOX_ROWS_WORDS.twice(name) };
    seen.add(name);
    parsed.push({ name, value });
  }
  const look = parsed.find((pair) => pair.name === INBOX_ROWS_LOOK_NAME);
  let next = look ? inboxRowsCanonical(INBOX_ROWS_LOOKS.find((entry) => entry.value === look.value)!.rows) : inboxRowsCanonical(rows);
  for (const pair of parsed) {
    if (pair.name === INBOX_ROWS_LOOK_NAME) continue;
    const setting = INBOX_ROWS_SETTINGS.find((entry) => entry.name === pair.name)!;
    next = inboxRowsWithChange(next, setting.set(pair.value, new Set(next)));
  }
  return { rows: next };
}

const wordOf = (setting: InboxRowsSetting, on: On) => {
  const value = setting.get(on);
  return setting.values.find((entry) => entry.value === value)?.label ?? "off";
};

/** A change as lines, one per option that moved, in the page's words: "Spacing: Comfortable -> Compact". */
export function inboxRowsChangeLines(before: readonly InboxRowsOption[], after: readonly InboxRowsOption[]): string[] {
  const was = new Set(inboxRowsCanonical(before));
  const now = new Set(inboxRowsCanonical(after));
  return INBOX_ROWS_SETTINGS.filter((setting) => setting.get(was) !== setting.get(now)).map((setting) => `${setting.label}: ${wordOf(setting, was)} -> ${wordOf(setting, now)}`);
}

/** Every fixed line the commands print. Functions take the parts that vary. */
export const INBOX_ROWS_WORDS = {
  listHead: "Your Inbox rows now. Change them with: plannotator inbox rows set <name>=<value> ...",
  listFoot: "Not row options: text size and theme (Settings > General), colours, fonts, columns, sorting.",
  changedHead: "Changed your Inbox rows:",
  changedFoot: "Every open Inbox window shows it now, with Undo. To undo from here: plannotator inbox rows undo",
  nothingChanged: "Nothing changed: the rows already look like that.",
  undoneHead: "Put your Inbox rows back:",
  nothingToUndo: "Nothing to undo.",
  unknownName: (name: string) => `'${name}' is not a row option. Run 'plannotator inbox rows' for the names. Nothing changed.`,
  badValue: (name: string, values: string, given: string) => `${name} takes ${values}, not '${given}'. Nothing changed.`,
  twice: (name: string) => `'${name}' is given twice. Nothing changed.`,
  setNeedsPairs: "inbox rows set needs at least one <name>=<value>.",
} as const;

/** `plannotator inbox rows`: every option with its value now, its choices and what it changes. */
export function inboxRowsListing(rows: readonly InboxRowsOption[]): string {
  const on = new Set(inboxRowsCanonical(rows));
  const line = (name: string, value: string, values: readonly { value: string }[], changes: string) => `${`${name}=${value}`.padEnd(24)} ${values.map((entry) => entry.value).join(" | ").padEnd(35)} ${changes}`;
  return [
    INBOX_ROWS_WORDS.listHead,
    "",
    ...INBOX_ROWS_SETTINGS.map((setting) => line(setting.name, setting.get(on) ?? "none", setting.values, setting.changes)),
    "",
    line(INBOX_ROWS_LOOK_NAME, inboxRowsLookOf(rows) ?? "none", INBOX_ROWS_LOOKS, LOOK_CHANGES),
    "",
    INBOX_ROWS_WORDS.listFoot,
    "",
  ].join("\n");
}

/** The listing as data (`--json`). */
export function inboxRowsListingJson(rows: readonly InboxRowsOption[]) {
  const on = new Set(inboxRowsCanonical(rows));
  return {
    options: INBOX_ROWS_SETTINGS.map((setting) => ({ name: setting.name, value: setting.get(on), values: setting.values.map((entry) => entry.value), changes: setting.changes })),
    look: inboxRowsLookOf(rows),
  };
}

/** `plannotator inbox rows --help`. */
export const INBOX_ROWS_USAGE = [
  "Usage:",
  "  plannotator inbox rows [--json]",
  "  plannotator inbox rows set <name>=<value> ... [--json]",
  "  plannotator inbox rows undo [--json]",
  "",
  "Shows and changes how the rows of the person's Inbox list look.",
  "'rows' prints every option, what it changes and its value now.",
  "'rows set' changes options in one save; every open window shows it at once.",
  "'rows undo' puts the last change back.",
  "It changes row options only, except agent-icons=project, which also shows in the Agents list and threads.",
].join("\n");

/** The line in `plannotator inbox --help`'s usage. */
export const INBOX_ROWS_USAGE_LINE = "  plannotator inbox rows [set <name>=<value>... | undo] [--json]";

/** The section in `plannotator inbox --help`'s agent help. */
export const INBOX_ROWS_HELP_SECTION = [
  "## When the person asks you to change how their Inbox list looks",
  "",
  "Run `plannotator inbox rows`: it prints every row option, what it changes and its value now. Change what they asked with `plannotator inbox rows set <name>=<value> ...`; every open window shows it at once. `plannotator inbox rows undo` puts the last change back. Tell them what changed, in the words the command printed. An ask with no row option (a colour, a font, text size) stays as it is: say so.",
];

/** Who made a rows save, when an agent's command did (the window's own saves carry none). */
export interface InboxRowsBy {
  host: string;
  session: string;
}

/** A save's `rows_by` as sent: a host and a session, short strings; anything else is no one. */
export function inboxRowsBy(value: unknown): InboxRowsBy | null {
  if (!value || typeof value !== "object") return null;
  const { host, session } = value as Record<string, unknown>;
  if (typeof host !== "string" || typeof session !== "string" || !host || !session || host.length > 64 || session.length > 200) return null;
  return { host, session };
}
