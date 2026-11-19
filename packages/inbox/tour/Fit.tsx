/**
 * How the Inbox fits with your agents (the owner, for 0.28.31; copy from the
 * tour v2 brief, step 0, exactly): the top tile of the first-run "Two paths"
 * bento, and the short first card when the tour starts ("a fresh reminder").
 *
 * The picture: your own agents, one line each (their real mark, their
 * name, "(you run this as normal)"), a straight arrow from each into the
 * Inbox card at the same height, and a primary "your reply" arrow back,
 * parallel to Claude Code's. HTML and CSS only, no asset but the card's
 * thumbnail. The reply arrow draws once, 600 ms, not under reduced motion.
 */
import { HostMark, Icon } from '../icons';
import { tourAssetUrl } from './assets';

export const TOUR_FIT_TITLE = '收件箱与你的智能体协同工作';
export const TOUR_FIT_LINES = [
  '它不会取代它们：照常在你的终端或编辑器中运行 Claude Code、Pi 或 OpenCode。',
  '当它们需要你时，会把问题、已完成的工作和文件发送到这里。',
  '你的回复会回到同一个会话，它会继续工作。',
] as const;
const PICTURE_ALT = '你的智能体继续在你的终端和编辑器中运行。它们把问题、工作和文件发送到收件箱；你的回复会回到同一个会话。';

/** One of your agents, in one line: its mark, its name, and that you run it as normal. */
function Session({ host, name, row }: { host: string; name: string; row: number }) {
  return (
    <div className="tp-win" style={{ gridRow: row }}>
      <HostMark host={host} />
      <b>{name}</b>
      <span className="tp-note">
        <span className="tp-note-long">（你照常运行）</span>
        <span className="tp-note-short">（照常运行）</span>
      </span>
    </div>
  );
}

/** A straight arrow from a session into the Inbox card, at the session's height; Claude Code's has the reply back beside it. */
function Link({ row, reply }: { row: number; reply?: boolean }) {
  return (
    <div className="tp-link" style={{ gridRow: row }}>
      <i className="tp-to" />
      {reply && (
        <>
          <i className="tp-back tp-ret-draw" />
          <span className="tp-reply">你的回复</span>
        </>
      )}
    </div>
  );
}

export function TourFitPicture() {
  return (
    <div className="tp-wrap">
      <div className="tp" role="img" aria-label={PICTURE_ALT}>
        <Session host="claude-code" name="Claude Code" row={1} />
        <Session host="pi" name="Pi" row={2} />
        <Session host="opencode" name="OpenCode" row={3} />
        <Link row={1} reply />
        <Link row={2} />
        <Link row={3} />
        {/* A phone: the sessions on top, then the questions down and the reply up, side by side. */}
        <div className="tp-down" aria-hidden="true">
          <span className="tp-dn">↓ 问题、工作、文件</span>
          <span className="tp-up">↑ 你的回复</span>
        </div>
        <div className="tp-inbox">
          <div className="tp-ih">
            <Icon name="inbox" size={13} />
            收件箱
          </div>
          <div className="tp-row">
            <HostMark host="claude-code" />
            <b>哪个方向？</b>
            <span className="tp-c">1 个问题</span>
            {/* Not here: the row keeps its words, never a broken image. */}
            <img className="tp-th" src={tourAssetUrl('vs-a-thumb.webp')} alt="" onError={(event) => (event.currentTarget.style.display = 'none')} />
          </div>
          <div className="tp-row">
            <HostMark host="pi" />
            <b>结账页已完成</b>
            <span className="tp-c">2 个文件</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The words: the title and its three sentences (the heading level is the host's). */
export function TourFitText({ as: Heading = 'h3', id }: { as?: 'h2' | 'h3'; id?: string }) {
  return (
    <>
      <Heading id={id} tabIndex={-1}>
        {TOUR_FIT_TITLE}
      </Heading>
      {TOUR_FIT_LINES.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

/**
 * The tour's first card: the same explanation, then Show me. Not modal: the tour bar (and its Exit) stays in
 * reach above it. Focus goes to its title when it opens.
 */
export function TourIntro({ onGo }: { onGo: () => void }) {
  return (
    <div className="ib-tour-intro-scrim">
      <section className="ib-tour-intro" role="region" aria-labelledby="ib-tour-intro-h" data-tour-intro="">
        <div className="ib-ti-pic">
          <TourFitPicture />
        </div>
        <div className="ib-ti-body">
          <TourFitText as="h2" id="ib-tour-intro-h" />
          <div className="ib-ti-acts">
            <button type="button" className="ib-btn ib-pri" onClick={onGo} data-tour-intro-go="">
              给我看看
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
