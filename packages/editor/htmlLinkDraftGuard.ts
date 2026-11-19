/**
 * Following a link in a raw-HTML page while a comment is being typed would
 * swap the document out from under the open composer (it is portaled to the
 * page, so it would float over the next document and attach to the wrong
 * one). The editor has no "unsaved comment" question for this, so the link
 * waits: the draft stays, focus goes back to it, and a toast says why.
 * The Inbox asks the same question through its pane's leave().
 */

/** The textarea of an open comment composer that holds typed words, or null. */
export function typedCommentDraft(doc: Document = document): HTMLTextAreaElement | null {
  for (const area of doc.querySelectorAll<HTMLTextAreaElement>('[data-comment-popover] textarea')) {
    if (area.value.trim() !== '') return area;
  }
  return null;
}

export const LINK_WAITS_FOR_DRAFT_TITLE = '你的评论尚未保存';

export function linkWaitsForDraftDescription(target: string): string {
  return `请先保存或放弃这条评论，然后再打开指向 ${target} 的链接。`;
}
