// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
/**
 * Every word of the "Star the repo" ask (approval "star-ask"), in one place so they can be swapped in one edit. The
 * owner's pick (q-bc8be138, 2026-11-06): the short words everywhere, the Inbox's corner card and the done screen's card
 * alike, with no "We'll only ask once." line.
 *
 * The art's words (`art`) are drawn in two subset faces (utils/starAskFonts.ts): lower-case a-z, space, "?", "." and
 * "!" for the big line, a-z, space and "·" for the small row. The big line is solved to the measure at run time, so a
 * new word still fills it.
 */
export const STAR_ASK_WORDS = {
  title: '愿意给 Plannotator 点个 Star 吗？',
  body: '它是免费开源的。一个 Star 能让更多人发现它，也能帮我们把项目继续做下去。',
  notNow: '以后再说',
  star: '在 GitHub 上点 Star',
  starring: '正在点 Star…',
  /** gh starred it. */
  starred: '已点 Star，谢谢！',
  /** The link opened GitHub in a new tab (no gh, or gh could not check). */
  opened: '谢谢！GitHub 已在新标签页打开。',
  /** gh could not star it on the click (a token not allowed to star, the network): the link follows. */
  failed: '无法从这里点 Star。',
  openGitHub: '打开 GitHub',
  close: '关闭',
  // The art band stays in English on purpose: its two self-hosted subset faces
  // (utils/starAskFonts.ts) carry only a-z, space, "?", ".", "!" and "·", so a
  // CJK word would fall out of the solved layout. It is aria-hidden decoration;
  // the title, body and buttons above carry the ask in Chinese.
  art: {
    label: 'plannotator · open source',
    ask: 'a small ask',
    after: 'decided · recorded',
    big: 'star it?',
    bigAfter: 'starred.',
  },
} as const;

export type StarAskWords = typeof STAR_ASK_WORDS;
