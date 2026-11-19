/**
 * One decision card of decision mode (approval "inbox-decision-mode", the
 * Queue direction; experimental). Who and where, the prompt, why it waits,
 * the context, the pictures, the answers, then the secondary actions, in
 * that order (brief §7, the screen reader order).
 *
 * The agent contract lines (approval "inbox-decision-mode", "Agent contract
 * lines", 2026-10-24; drawn as contract-compare.html has them), read from the
 * question by `cardFacts`: the Stakes line under the prompt, the Shows picture
 * leading on the left (a Shows file is one of the card's references), the Why
 * line under the answers, and for `Reversible: no` a "One-way" badge, no
 * swipe, and a confirm step before any answer but a Skip counts (the grammar
 * does not say which choice is the one-way one, so the recommendation asks
 * too). Picture choices are the
 * thread card's own tiles (ui's `QuestionPictureTiles`): the picture picks and
 * the zoom button opens the viewer, never both.
 */
import { inboxUrl, machineOf } from '../inboxUrl';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { InlineMarkdown } from '@plannotator/ui/components/InlineMarkdown';
import { QuestionPictureTiles } from '@plannotator/ui/components/blocks/QuestionBlock';
import type { InboxDecision, InboxQuestion } from '@plannotator/core/inbox-types';
import { readInboxQuestionKind } from '@plannotator/core/inbox-types';
import type { QuestionAnswer } from '@plannotator/core/question-block';
import { agentName, formatCount, shortTime } from '../format';
import { HostMark, Icon } from '../icons';
import { inboxMessageImageUrl } from '../images';
import { Tip } from '../components/Tip';
import { ContextMarkdown } from '../components/ContextMarkdown';
import { useRefRepo } from '../links';
import { choiceName } from '../optionSets';
import { answerNeedsConfirm, answerWords, choiceAnswer, confirmLabel, otherAnswer, skipAnswer, swipeChoices, swipeHint, textAnswer } from './model';

/**
 * The contract lines a card shows (the question's additive `stakes`, `why`,
 * `reversible` and `shows`; absent on older records, which draw as before).
 */
export interface CardFacts {
  /** `Stakes:` — the bold line under the prompt. */
  stakes: string | null;
  /** `Why:` — under the answers. */
  why: string | null;
  /** `Reversible: no — <why>`: the One-way badge, a confirm step, and never a swipe. `why` may be null. */
  irreversible: { why: string | null } | null;
  /** `Shows:` — the one picture (the hero) or file (a reference) the decision is about. */
  shows: { kind: 'image' | 'link'; label: string; src: string } | null;
}

/**
 * A line the card draws as a sentence, as contract-compare.html draws them: its first letter capitalised,
 * but only when its first word is plain lower-case letters (a-z, then a space, or a punctuation mark and a
 * space), so a URL, a path, `code` or a name such as iOS stays as written.
 */
export function sentence(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return /^[a-z]+[,;:.!?]?(?:\s|$)/.test(trimmed) ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}

export function cardFacts(decision: InboxDecision): CardFacts {
  const q = decision.question;
  return {
    stakes: sentence(q.stakes),
    why: sentence(q.why),
    // The reason follows "Can't be undone:", so it stays as the agent wrote it.
    irreversible: q.reversible ? { why: q.reversible.why?.trim() || null } : null,
    shows: q.shows ?? null,
  };
}

/** A picture the card shows: a captured image of the message, or an image file it attached. */
export interface CardPicture {
  attachmentId: string;
  name: string;
  /** The src the context wrote it as, when it came from there (left out of the context, shown as the hero). */
  ref: string | null;
  src: string;
  /** The picture's own alt text, where its name is something else (a picture choice is named by its choice). */
  alt?: string;
}

/**
 * The pictures on the card's left: the `Shows:` picture first, then the
 * message's other images and image files. A picture choice's picture is its
 * tile, never here.
 */
export function cardPictures(decision: InboxDecision): CardPicture[] {
  const q = decision.question;
  const choiceRefs = new Set(q.choices.map((choice) => choice.image?.src).filter((src): src is string => !!src));
  const out: CardPicture[] = decision.pictures.inline
    .filter((image) => !choiceRefs.has(image.ref))
    .map((image) => ({
      attachmentId: image.attachment_id,
      name: image.name,
      ref: image.ref,
      src: inboxUrl(`/attachments/${encodeURIComponent(image.attachment_id)}/image`, undefined, machineOf(image.attachment_id)),
    }));
  for (const file of decision.pictures.attachments) {
    if (file.kind !== 'image') continue;
    out.push({ attachmentId: file.attachment_id, name: file.name, ref: null, src: inboxUrl(`/attachments/${encodeURIComponent(file.attachment_id)}/image`, undefined, machineOf(file.attachment_id)) });
  }
  if (q.shows?.kind === 'image') {
    const src = q.shows.src;
    const at = out.findIndex((picture) => picture.ref === src);
    const shown = at >= 0 ? out.splice(at, 1)[0]! : { attachmentId: '', name: '', ref: src, src: inboxMessageImageUrl(decision.message.id, src) };
    out.unshift({ ...shown, name: q.shows.label || shown.name || '图片' });
  }
  return out;
}

/** Where a picture choice's picture loads from: its captured file, else the message's image route. */
export function choicePictureUrl(decision: InboxDecision, src: string): string {
  const image = decision.pictures.inline.find((candidate) => candidate.ref === src);
  return image ? inboxUrl(`/attachments/${encodeURIComponent(image.attachment_id)}/image`, undefined, machineOf(image.attachment_id)) : inboxMessageImageUrl(decision.message.id, src);
}

/**
 * The attached file a `Shows:` link names, if the message carries it: by its path when the link has a
 * folder (the file's real path, or the path it was named by, ends with it), else by its file name.
 */
export function showsFile(decision: InboxDecision, src: string): InboxDecision['pictures']['attachments'][number] | null {
  const path = (src.split(/[?#]/)[0] ?? '').replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
  const name = path.split('/').pop() ?? '';
  const files = decision.pictures.attachments;
  if (path.includes('/')) {
    const byPath = files.find((file) => (file.paths ?? []).some((p) => { const at = p.replace(/\\/g, '/'); return at === path || at.endsWith(`/${path}`); }));
    if (byPath) return byPath;
  }
  return files.find((file) => file.name === name) ?? null;
}

/**
 * The context without what the card draws apart: the images (the hero and its
 * strip), and the `Stopped:` and `Holds up:` lines (drawn as their own lines
 * under the prompt; the server reads them from the context the same way).
 */
function contextWithout(context: string, refs: readonly string[]): string {
  let out = context
    .split('\n')
    .filter((line) => !/^\s*(?:stopped|holds up)\s*:/i.test(line))
    .join('\n');
  for (const ref of refs) {
    const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`!\\[[^\\]]*\\]\\(\\s*<?${escaped}>?(?:\\s+"[^"]*")?\\s*\\)`, 'g'), '');
    out = out.replace(new RegExp(`<img\\b[^>]*\\bsrc=["']${escaped}["'][^>]*>`, 'gi'), '');
  }
  return out.trim();
}


export interface DecisionCardProps {
  decision: InboxDecision;
  /** The banner over the card when the agent replaced the question on screen. */
  banner?: ReactNode;
  /** The pick just made (the stamp): the card shows it while it leaves. */
  stamp: QuestionAnswer | 'done' | 'cant' | null;
  phone: boolean;
  touch: boolean;
  /** Answer the question (a pick, saved at once). */
  onAnswer: (answer: QuestionAnswer) => void;
  /** An action item's Done, or Can't do it with the reason. */
  onAction: (mark: { outcome: 'done' | 'cant'; note?: string }) => void;
  onLater: () => void;
  onOpenThread: (fileId?: string) => void;
  onImage: (pictures: CardPicture[], index: number) => void;
  /** Escape walked out of a field the card opened: report it so the dialog does not close too. */
  fieldOpenRef: { current: (() => boolean) | null };
  /** Whether the card holds words typed and not answered with (closing asks first). */
  unsavedWordsRef?: { current: (() => boolean) | null };
  /** A reply already took this answer (Previous reached it): drawn read only. */
  sent?: boolean;
  /** Its group's reply is on its way: drawn read only until it lands (a pick would race the Send). */
  sending?: boolean;
  /** Words typed on cards the queue moved away from, by decision id: put back here, kept from here. */
  keptWords?: Map<string, CardWords>;
  /** The card is being edited (a box open, or words typed and not answered): its group's Hold waits. */
  onEditing?: (editing: boolean) => void;
  /** prefers-reduced-motion: a committed swipe stays where the finger left it, no exit motion. */
  reduced?: boolean;
}

/** The words a card holds before they are an answer. */
export interface CardWords {
  field: 'none' | 'other' | 'note' | 'cant';
  other: string;
  note: string;
  text: string;
  reason: string;
}

/** How far a committed swipe throws the card: past the window's edge. */
function flingDistance(direction: number): number {
  const width = typeof window === 'undefined' ? 1200 : window.innerWidth;
  return direction * Math.max(width, 600);
}

export function DecisionCard(props: DecisionCardProps) {
  const { decision } = props;
  const q = decision.question;
  // The thread's repo, so `#123` and `owner/repo#123` link as in the thread (none: they stay plain).
  const refRepo = useRefRepo(decision.thread.project.repo ?? null);
  const refProps = { githubRepo: refRepo?.display, repoHost: refRepo?.host };
  const kind = readInboxQuestionKind(q.kind);
  const facts = cardFacts(decision);
  const pictures = cardPictures(decision);
  const promptId = useId();
  const stakesId = `${promptId}-stakes`;
  const promptRef = useRef<HTMLHeadingElement>(null);
  const saved = q.state === 'picked' ? q.answer : null;
  const [selected, setSelected] = useState<string[]>(() => initialSelection(q));
  // Words kept from an earlier visit to this card (Later, Previous, a notification moved the queue) come back.
  const kept = props.keptWords?.get(decision.id);
  const [field, setField] = useState<'none' | 'other' | 'note' | 'cant'>(() => kept?.field ?? (saved?.other ? 'other' : saved?.note ? 'note' : 'none'));
  const [other, setOther] = useState(kept?.other ?? saved?.other ?? '');
  const [note, setNote] = useState(kept?.note ?? saved?.note ?? '');
  const [text, setText] = useState(kept?.text ?? saved?.text ?? '');
  const [reason, setReason] = useState(kept?.reason ?? '');
  const pointer = useRef(false);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState(0);
  /** A committed swipe's exit: the card keeps going that way from where the finger left it. */
  const [fling, setFling] = useState<number | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const locked = props.sent === true || props.sending === true;
  // Never a swipe for a one-way question or a picture choice (swipeChoices), nor while locked.
  const choices2 = locked ? null : swipeChoices(q);
  /** A pick on a `Reversible: no` question waiting for its confirm (contract-compare.html, pair 2). */
  const [confirming, setConfirming] = useState<{ answer: QuestionAnswer; words: string } | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  /** The choices as the card draws them: each description a sentence (the labels are the answers, as written). */
  const shownChoices = q.choices.map((choice) => (choice.description ? { ...choice, description: sentence(choice.description) } : choice));
  // Picture choices: each choice's picture URL, and the pictures that failed to load (a tile then shows its alt text).
  const [failedPictures, setFailedPictures] = useState<ReadonlySet<string>>(() => new Set());
  const tileUrls = q.choices.map((choice) => {
    if (!choice.image) return null;
    const url = choicePictureUrl(decision, choice.image.src);
    return failedPictures.has(url) ? null : url;
  });
  const showTiles = (kind === 'single' || kind === 'multi') && tileUrls.some((url) => url !== null);

  /** The words in a box the card shows, by box (empty when the box is closed). */
  const boxWords = (box: 'other' | 'note' | 'cant' | 'text'): string =>
    box === 'other' ? other : box === 'note' ? note : box === 'cant' ? reason : text;
  const openBoxEmpty = field === 'none' || !boxWords(field).trim();

  // Escape is one layer at a time. A box with words in it is a layer: Escape lets go of it (the
  // words stay, focus goes to the prompt), and the dialog then asks before it closes over them.
  // An empty box the card opened closes.
  props.fieldOpenRef.current = () => {
    // The confirm step is a layer of its own: Escape cancels it, nothing is answered.
    if (confirming) {
      cancelConfirm();
      return true;
    }
    const active = typeof document === 'undefined' ? null : document.activeElement;
    const inBox = active instanceof HTMLTextAreaElement && articleRef.current?.contains(active) === true;
    if (inBox && active.value.trim()) {
      promptRef.current?.focus({ preventScroll: true });
      return true;
    }
    if (field !== 'none' && openBoxEmpty) {
      setField('none');
      promptRef.current?.focus({ preventScroll: true });
      return true;
    }
    return false;
  };
  const differs = (typed: string, was: string | null | undefined) => typed.trim() !== '' && typed.trim() !== (was ?? '').trim();
  const typedWords =
    !props.stamp &&
    !locked &&
    ((kind === 'text' && differs(text, saved?.text)) ||
      (field === 'other' && differs(other, saved?.other)) ||
      differs(note, saved?.note) ||
      (field === 'cant' && reason.trim() !== ''));
  if (props.unsavedWordsRef) props.unsavedWordsRef.current = () => typedWords;

  // Being edited (a box open, or words typed): its group's Hold waits. Said once per change, and undone when the card goes.
  const editing = !props.stamp && !locked && (field !== 'none' || typedWords);
  const onEditing = useRef(props.onEditing);
  onEditing.current = props.onEditing;
  useEffect(() => {
    onEditing.current?.(editing);
  }, [editing]);
  useEffect(() => () => onEditing.current?.(false), []);

  // Words typed and not answered with are kept when the card goes, and dropped once answered.
  const words = useRef<{ typed: boolean; value: CardWords }>({ typed: false, value: { field, other, note, text, reason } });
  words.current = { typed: typedWords, value: { field, other, note, text, reason } };
  useEffect(() => {
    const store = props.keptWords;
    return () => {
      if (!store) return;
      if (words.current.typed) store.set(decision.id, words.current.value);
      else store.delete(decision.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.id]);

  useEffect(() => {
    promptRef.current?.focus({ preventScroll: true });
  }, [decision.id]);

  // The confirm step takes focus on its safe button: Enter there cancels, never answers.
  useEffect(() => {
    if (!confirming) return;
    // On a phone the step can open below the fold: it comes into view with the focus.
    confirmCancelRef.current?.focus();
    confirmCancelRef.current?.closest('[data-decision-confirm-pick]')?.scrollIntoView?.({ block: 'nearest' });
  }, [confirming]);

  /** An answer counts at once, unless it cannot be undone: then it asks once more first. */
  const request = (answer: QuestionAnswer) => {
    if (answerNeedsConfirm(q, answer)) setConfirming({ answer, words: answerWords(answer) });
    else props.onAnswer(answer);
  };
  const cancelConfirm = () => {
    const was = confirming;
    setConfirming(null);
    // A pick-one goes back to what it showed before (the saved pick, or nothing); focus to the choice the person
    // was on, else the prompt.
    if (kind === 'single') setSelected(initialSelection(q));
    const label = was?.answer.selected[0];
    const radio = label ? [...(articleRef.current?.querySelectorAll<HTMLInputElement>('.ib-dm-answers input') ?? [])].find((input) => input.value === label) : undefined;
    (radio ?? promptRef.current)?.focus({ preventScroll: true });
  };

  const commitChoice = (labels: readonly string[]) => {
    if (labels.length === 0) return;
    request(choiceAnswer(q, labels, note));
  };

  const author = decision.message.author;
  const name = agentName(author);
  const badge = q.stopped !== null ? <span className="ib-badge ib-b-stop">已停止</span> : q.holds_up.length > 0 ? <span className="ib-badge ib-b-hold">阻塞 {formatCount(q.holds_up.length)} 项</span> : null;
  const heroRefs = pictures.map((p) => p.ref).filter((r): r is string => r !== null);
  const context = contextWithout(q.context ?? '', heroRefs);
  // A `Shows:` file leads the references: the attached file it names, else a web link, else the thread.
  const shownFile = facts.shows?.kind === 'link' ? showsFile(decision, facts.shows.src) : null;
  const files = decision.pictures.attachments.filter((f) => f.kind !== 'image' && f.attachment_id !== shownFile?.attachment_id);
  const recommendedLabels = q.choices.filter((c) => c.recommended).map((c) => c.label);
  /** The tile pictures, for the viewer's stepping (a zoom opens on its own tile). */
  const tilePictures: CardPicture[] = q.choices.flatMap((choice, index) =>
    choice.image && tileUrls[index] ? [{ attachmentId: '', name: choiceName(choice.label, index, q.choices.map((c) => c.label)), alt: choice.image.alt || choice.label, ref: choice.image.src, src: tileUrls[index]! }] : [],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!choices2 || event.pointerType !== 'touch' || props.stamp) return;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (Math.abs(event.clientY - start.y) > Math.abs(dx) && Math.abs(dx) < 12) return;
    setDrag(dx);
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId || !choices2) return setDrag(0);
    const dx = event.clientX - start.x;
    // Short of the threshold: back to the centre.
    if (Math.abs(dx) < 90) return setDrag(0);
    // Committed: the card stays where the finger left it, then (with motion) keeps going that way while the
    // stamp shows; it never jumps back to the centre first. Under reduced motion it just stays.
    setDrag(dx);
    if (!props.reduced) {
      const target = flingDistance(Math.sign(dx));
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setFling(target));
      else setFling(target);
    }
    commitChoice([dx > 0 ? choices2[0] : choices2[1]]);
  };

  return (
    <article
      className="ib-dm-card"
      aria-labelledby={promptId}
      aria-describedby={facts.stakes ? stakesId : undefined}
      data-decision-card={decision.id}
      data-one-way={facts.irreversible ? '' : undefined}
      data-kind={kind}
      data-has-picture={pictures.length > 0 ? '' : undefined}
      ref={articleRef}
      data-stamped={props.stamp ? '' : undefined}
      data-flung={drag !== 0 && props.stamp ? '' : undefined}
      data-sent={locked ? '' : undefined}
      style={
        fling !== null
          ? {
              translate: `${fling}px 0`,
              rotate: `${Math.max(-18, Math.min(18, fling / 40))}deg`,
              opacity: 0,
              transition: 'translate 320ms cubic-bezier(0.2, 0.6, 0.3, 1), rotate 320ms cubic-bezier(0.2, 0.6, 0.3, 1), opacity 260ms ease-in 60ms',
            }
          : drag
            ? { translate: `${drag}px 0`, rotate: `${Math.max(-18, Math.min(18, drag / 40))}deg` }
            : undefined
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={() => {
        swipe.current = null;
        setDrag(0);
      }}
    >
      {props.banner}
      {pictures.length > 0 && (
        <div className="ib-dm-pics" data-decision-pictures="">
          <button type="button" className="ib-dm-hero" onClick={() => props.onImage(pictures, 0)} aria-label={`放大查看 ${pictures[0]!.name}`}>
            <img src={pictures[0]!.src} alt="" />
            <span className="ib-dm-zoom" aria-hidden="true">
              <Icon name="expand" size={14} />
              查看大图
            </span>
          </button>
          {pictures.length > 1 && (
            <div className="ib-dm-thumbs">
              {pictures.slice(1).map((p, i) => (
                <button key={p.attachmentId} type="button" className="ib-dm-thumb" onClick={() => props.onImage(pictures, i + 1)} aria-label={`放大查看 ${p.name}`}>
                  <img src={p.src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="ib-dm-main">
        {/* Who and where. */}
        <div className="ib-dm-who">
          <HostMark host={author.kind === 'agent' ? author.host : null} />
          <b>{name}</b>
          <span>· {decision.thread.project.name}</span>
          {decision.thread.subject && (
            <Tip content={decision.thread.subject} cut>
              <span className="ib-dm-subj">· {decision.thread.subject}</span>
            </Tip>
          )}
          <span>· {shortTime(decision.message.created_at)}</span>
          {badge}
          {facts.irreversible && (
            <Tip content={facts.irreversible.why ? `无法撤销：${facts.irreversible.why}` : "无法撤销"}>
              <span className="ib-badge ib-b-oneway" data-decision-one-way="">
                One-way
                <span className="ib-sr">：无法撤销{facts.irreversible.why ? `，${facts.irreversible.why}` : ''}</span>
              </span>
            </Tip>
          )}
        </div>
        <h2 id={promptId} ref={promptRef} tabIndex={-1} className="ib-dm-prompt" data-decision-prompt="">
          <InlineMarkdown {...refProps} text={q.prompt} />
        </h2>
        {/* The stakes line (`Stakes:`): what the choice affects, in one sentence. */}
        {facts.stakes && (
          <p id={stakesId} className="ib-dm-stakes" data-decision-stakes="">
            <Icon name="warn" size={16} />
            <span>
              <InlineMarkdown {...refProps} text={facts.stakes} />
            </span>
          </p>
        )}
        {q.stopped !== null && (
          <p className="ib-dm-stop" data-decision-stopped="">
            <Icon name="warn" size={16} />
            <span>已停止{q.stopped ? `: ${q.stopped}` : ''}</span>
          </p>
        )}
        {q.holds_up.length > 0 && (
          <p className="ib-dm-hold">
            <Icon name="clock" size={16} />
            <span>阻塞 {q.holds_up.join(', ')}</span>
          </p>
        )}
        {decision.message.excerpt && <p className="ib-dm-excerpt">{decision.message.excerpt}</p>}
        <ContextMarkdown
          className="ib-body ib-dm-ctx"
          data-decision-context=""
          markdown={context}
          messageId={decision.message.id}
          refRepo={refRepo}
          onImage={(src, alt) => props.onImage([{ attachmentId: '', name: alt || '图片', ref: null, src }], 0)}
        />
        <div className="ib-dm-refs">
          {facts.shows?.kind === 'link' &&
            (shownFile ? (
              <button type="button" className="ib-dm-file" data-decision-shows="" onClick={() => props.onOpenThread(shownFile.attachment_id)}>
                <Icon name="doc" size={15} />
                <span>{facts.shows.label || shownFile.name}</span>
              </button>
            ) : /^https?:\/\//i.test(facts.shows.src) ? (
              <a className="ib-dm-file" data-decision-shows="" href={facts.shows.src} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={15} />
                <span>{facts.shows.label || facts.shows.src}</span>
              </a>
            ) : (
              <button type="button" className="ib-dm-file" data-decision-shows="" onClick={() => props.onOpenThread()}>
                <Icon name="doc" size={15} />
                <span>{facts.shows.label || facts.shows.src}</span>
              </button>
            ))}
          {files.map((file) => (
            <button key={file.attachment_id} type="button" className="ib-dm-file" onClick={() => props.onOpenThread(file.attachment_id)}>
              <Icon name="doc" size={15} />
              <span>{file.name}</span>
            </button>
          ))}
          <button type="button" className="ib-dm-open" data-decision-open-thread="" onClick={() => props.onOpenThread()}>
            <Icon name="comment" size={15} />
            打开话题
          </button>
        </div>

        {locked && (
          <p className="ib-dm-sentline" data-decision-sent={props.sending && !props.sent ? undefined : ''} data-decision-sending={props.sending && !props.sent ? '' : undefined}>
            <Icon name={props.sending && !props.sent ? 'clock' : 'check'} size={16} />
            <span>
              <b>{props.sending && !props.sent ? '发送中' : '已发送'}</b> · {kind === 'action' ? (q.action_result?.outcome === 'cant' ? "无法完成" : '完成') : answerWords(q.answer)}
            </span>
          </p>
        )}
        {/* The answers. */}
        {!locked && (
        <div className="ib-dm-answers" onPointerDownCapture={() => (pointer.current = true)} onKeyDownCapture={() => (pointer.current = false)}>
          {showTiles && (
            <div className="ib-dm-tiles" role={kind === 'multi' ? 'group' : 'radiogroup'} aria-labelledby={promptId} data-decision-tiles="">
              <QuestionPictureTiles
                choices={shownChoices}
                urls={tileUrls}
                selected={selected}
                inputType={kind === 'multi' ? 'checkbox' : 'radio'}
                name={`ib-dm-${decision.id}`}
                onPick={(label, checked) =>
                  kind === 'multi'
                    ? setSelected((current) => (checked ? [...current.filter((l) => l !== label), label] : current.filter((l) => l !== label)))
                    : checked && setSelected([label])
                }
                // The picture picks (it is in the tile's label); the zoom button opens the viewer and never picks.
                // By the choice's place, not its picture's URL: a picture two choices share opens as the one zoomed.
                onZoom={(_url, _alt, index) => props.onImage(tilePictures, q.choices.slice(0, index).filter((c, i) => c.image && tileUrls[i]).length)}
                onPictureError={(url) => setFailedPictures((prev) => (prev.has(url) ? prev : new Set([...prev, url])))}
                renderText={(text) => <InlineMarkdown {...refProps} text={text} />}
                inputProps={(label) => ({
                  value: label,
                  onClick:
                    kind === 'single'
                      ? () => {
                          // A click (or a tap) on the picture or the words answers at once; the arrow keys only move.
                          if (pointer.current) commitChoice([label]);
                        }
                      : undefined,
                  onKeyDown:
                    kind === 'single'
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            commitChoice([label]);
                          }
                        }
                      : undefined,
                })}
                renderBadges={(choice) => (
                  <>
                    {choice.recommended && <span className="ib-dm-rec">推荐</span>}
                  </>
                )}
              />
            </div>
          )}
          {kind === 'single' && !showTiles && (
            <fieldset className={`ib-dm-choices${q.choices.length === 2 ? ' ib-dm-two' : ''}`} aria-labelledby={promptId}>
              {shownChoices.map((choice) => {
                const on = selected.includes(choice.label);
                const isSaved = saved?.selected.includes(choice.label) === true;
                return (
                  <label key={choice.label} className="ib-dm-choice" data-on={on ? '' : undefined} data-recommended={choice.recommended ? '' : undefined} data-saved={isSaved ? '' : undefined}>
                    <input
                      type="radio"
                      name={`ib-dm-${decision.id}`}
                      value={choice.label}
                      checked={on}
                      onChange={() => setSelected([choice.label])}
                      // A click (or a tap) answers at once; the arrow keys only move the choice, Enter or Space answers.
                      onClick={() => {
                        if (pointer.current) commitChoice([choice.label]);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          commitChoice([choice.label]);
                        }
                      }}
                    />
                    <span className="ib-dm-dot" aria-hidden="true" />
                    <span className="ib-dm-ch">
                      <span className="ib-dm-chl">
                        <InlineMarkdown {...refProps} text={choice.label} />
                      </span>
                      {choice.description && (
                        <span className="ib-dm-chd">
                          <InlineMarkdown {...refProps} text={choice.description} />
                        </span>
                      )}
                      </span>
                    {choice.recommended && <span className="ib-dm-rec">推荐</span>}
                  </label>
                );
              })}
            </fieldset>
          )}
          {kind === 'multi' && !showTiles && (
            <fieldset className="ib-dm-choices" aria-labelledby={promptId}>
              {shownChoices.map((choice) => {
                const on = selected.includes(choice.label);
                return (
                  <label key={choice.label} className="ib-dm-choice ib-dm-check" data-on={on ? '' : undefined} data-recommended={choice.recommended ? '' : undefined}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setSelected((current) => (current.includes(choice.label) ? current.filter((l) => l !== choice.label) : [...current, choice.label]))}
                    />
                    <span className="ib-dm-box" aria-hidden="true" />
                    <span className="ib-dm-ch">
                      <span className="ib-dm-chl">
                        <InlineMarkdown {...refProps} text={choice.label} />
                      </span>
                      {choice.description && (
                        <span className="ib-dm-chd">
                          <InlineMarkdown {...refProps} text={choice.description} />
                        </span>
                      )}
                      </span>
                    {choice.recommended && <span className="ib-dm-rec">推荐</span>}
                  </label>
                );
              })}
            </fieldset>
          )}
          {kind === 'multi' && !confirming && (
            <button type="button" className="ib-btn ib-pri ib-dm-go" data-decision-answer="" disabled={selected.length === 0} onClick={() => commitChoice(selected)}>
              回答 {formatCount(selected.length)} 项
            </button>
          )}
          {kind === 'single' && !confirming && selected.length > 0 && !(saved && sameSet(saved.selected, selected) && !saved.other) && (
            <button type="button" className="ib-btn ib-pri ib-dm-go" data-decision-answer="" onClick={() => commitChoice(selected)}>
              回答
            </button>
          )}
          {kind === 'text' && (
            <div className="ib-dm-text">
              {q.suggested_text && (
                <div className="ib-dm-suggest">
                  <span>
                    <b>建议：</b> {q.suggested_text}
                  </span>
                  <button type="button" className="ib-btn ib-sm" onClick={() => setText(q.suggested_text ?? '')}>
                    使用
                  </button>
                </div>
              )}
              <textarea className="ib-dm-ta" aria-labelledby={promptId} value={text} rows={3} onChange={(event) => setText(event.target.value)} />
              <button type="button" className="ib-btn ib-pri ib-dm-go" data-decision-answer="" disabled={!text.trim()} onClick={() => request(textAnswer(q, text, note))}>
                回答
              </button>
            </div>
          )}
          {kind === 'action' && (
            <div className="ib-dm-action">
              {q.action?.where_url && (
                <a className="ib-btn" href={q.action.where_url} target="_blank" rel="noopener noreferrer">
                  打开 {q.action.where ?? '链接'}
                  <Icon name="external" size={14} />
                </a>
              )}
              {q.action?.run && (
                <div className="ib-dm-run">
                  <code>{q.action.run}</code>
                  <button type="button" className="ib-btn ib-sm" onClick={() => void navigator.clipboard?.writeText(q.action?.run ?? '')}>
                    复制
                  </button>
                </div>
              )}
              <div className="ib-dm-actbtns">
                <button type="button" className="ib-btn ib-pri" data-decision-done="" onClick={() => props.onAction({ outcome: 'done' })}>
                  完成
                </button>
                <button type="button" className="ib-btn" data-decision-cant="" aria-expanded={field === 'cant'} onClick={() => setField(field === 'cant' ? 'none' : 'cant')}>
                  无法完成…
                </button>
              </div>
              {field === 'cant' && (
                <div className="ib-dm-field">
                  <label className="ib-dm-flabel" htmlFor={`${promptId}-cant`}>
                    为什么无法完成？{name} 会原文看到这段话。
                  </label>
                  <textarea id={`${promptId}-cant`} className="ib-dm-ta" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} autoFocus />
                  <button type="button" className="ib-btn ib-pri ib-sm" disabled={!reason.trim()} onClick={() => props.onAction({ outcome: 'cant', note: reason.trim() })}>
                    发送
                  </button>
                </div>
              )}
            </div>
          )}
          {confirming && (
            <div className="ib-dm-confirm1" role="alertdialog" aria-labelledby={`${promptId}-confirm`} aria-describedby={`${promptId}-confirm-d`} data-decision-confirm-pick="">
              <span>
                <b id={`${promptId}-confirm`}>{confirming.words}?</b>{' '}
                <span id={`${promptId}-confirm-d`}>{facts.irreversible?.why ? `无法撤销：${facts.irreversible.why}` : "无法撤销。"}</span>
              </span>
              <button type="button" className="ib-btn" ref={confirmCancelRef} data-decision-confirm-cancel="" onClick={cancelConfirm}>
                取消
              </button>
              <button
                type="button"
                className="ib-btn ib-dm-danger"
                data-decision-confirm-yes=""
                aria-label={confirming.words}
                onClick={() => {
                  const answer = confirming.answer;
                  setConfirming(null);
                  props.onAnswer(answer);
                }}
              >
                {confirmLabel(confirming.words)}
              </button>
            </div>
          )}
          {facts.why && (
            <p className="ib-dm-why" data-decision-why="">
              <b>{recommendedLabels.length > 0 || q.suggested_text ? `${name} 为什么推荐它：` : '理由：'}</b> <InlineMarkdown {...refProps} text={facts.why} />
            </p>
          )}
          {/* Swipe is touch only, for a two-way choice, and always has its buttons (the choices above). */}
          {choices2 && props.touch && (
            <p className="ib-dm-swipehint" aria-hidden="true">
              {swipeHint(choices2)}
            </p>
          )}
        </div>
        )}

        {/* The secondary actions: Other, Add a note, Later, Skip. */}
        {!locked && kind !== 'action' && (
          <>
            {field === 'other' && kind !== 'text' && (
              <div className="ib-dm-field">
                <label className="ib-dm-flabel" htmlFor={`${promptId}-other`}>
                  你的回答
                </label>
                <textarea id={`${promptId}-other`} className="ib-dm-ta" rows={2} value={other} onChange={(event) => setOther(event.target.value)} autoFocus />
                <button type="button" className="ib-btn ib-pri ib-sm" data-decision-other-answer="" disabled={!other.trim()} onClick={() => request(otherAnswer(q, other, note))}>
                  回答
                </button>
              </div>
            )}
            {field === 'note' && (
              <div className="ib-dm-field">
                <label className="ib-dm-flabel" htmlFor={`${promptId}-note`}>
                  回答附言
                </label>
                <textarea id={`${promptId}-note`} className="ib-dm-ta" rows={2} value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
              </div>
            )}
            <div className="ib-dm-more">
              {kind !== 'text' && (
                <button type="button" className="ib-dm-lnk" aria-expanded={field === 'other'} data-decision-other="" onClick={() => setField(field === 'other' ? 'none' : 'other')}>
                  其他…
                </button>
              )}
              <button type="button" className="ib-dm-lnk" aria-expanded={field === 'note'} data-decision-note="" onClick={() => setField(field === 'note' ? 'none' : 'note')}>
                添加备注
              </button>
              <button type="button" className="ib-dm-lnk" data-decision-later="" onClick={props.onLater}>
                <Icon name="clock" size={15} />
                稍后
              </button>
              <button type="button" className="ib-dm-lnk" data-decision-skip="" onClick={() => props.onAnswer(skipAnswer(q, note))}>
                跳过
              </button>
            </div>
          </>
        )}
        {!locked && kind === 'action' && (
          <div className="ib-dm-more">
            <button type="button" className="ib-dm-lnk" data-decision-later="" onClick={props.onLater}>
              <Icon name="clock" size={15} />
              Later
            </button>
          </div>
        )}
      </div>
      {props.stamp && (
        <div className="ib-dm-stamp" aria-hidden="true">
          <Icon name="check" size={18} />
          {props.stamp === 'done' ? '完成' : props.stamp === 'cant' ? "无法完成" : answerWords(props.stamp)}
        </div>
      )}
    </article>
  );
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** What the card starts with: the saved pick, else (multi) the recommendation ticked, else nothing. */
function initialSelection(q: InboxQuestion): string[] {
  if (q.state === 'picked' && q.answer) return [...q.answer.selected];
  if (readInboxQuestionKind(q.kind) === 'multi') return q.choices.filter((c) => c.recommended).map((c) => c.label);
  return [];
}
