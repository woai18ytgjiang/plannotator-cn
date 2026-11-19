import { useEffect, useState } from 'react';
import type { RepoFileNoContentReason, RepoFileResponse, RepoRevisionInfo } from '@plannotator/shared/repo-files';

/**
 * One file of the repository at the diff's new side, as text, from
 * `GET /api/repo-file` (approved design record "review-explorer", step 2): a
 * file the review does not change, or the Whole file view of one it does.
 * Read once per path and snapshot; a new snapshot reads again.
 */
export type RepoFileText =
  | { status: 'loading' }
  | { status: 'ready'; content: string; revision: RepoRevisionInfo }
  | { status: 'empty'; reason: RepoFileNoContentReason; size?: number; revision?: RepoRevisionInfo }
  | { status: 'error'; message: string };

const cache = new Map<string, RepoFileText>();
const CACHE_LIMIT = 80;

function remember(key: string, value: RepoFileText) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
}

const inflight = new Map<string, Promise<RepoFileText>>();

function readRepoFile(key: string, path: string, snapshotId: string, fetchImpl: typeof fetch): Promise<RepoFileText> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;
  const read = fetchImpl(`/api/repo-file?snapshot=${encodeURIComponent(snapshotId)}&path=${encodeURIComponent(path)}`)
    .then(async (response): Promise<RepoFileText> => {
      const body = (await response.json()) as RepoFileResponse & { error?: string; reason?: string };
      if (!response.ok) {
        return {
          status: 'error',
          message: response.status === 409
            ? '自打开此标签页以来差异已变更，请刷新以重新读取文件。'
            : body.error ?? `HTTP ${response.status}`,
        };
      }
      const next: RepoFileText = body.content !== null && body.content !== undefined
        ? { status: 'ready', content: body.content, revision: body.revision }
        : { status: 'empty', reason: body.reason ?? 'unavailable', size: body.size, revision: body.revision };
      remember(key, next);
      return next;
    })
    .catch((error): RepoFileText => ({ status: 'error', message: error instanceof Error ? error.message : '无法读取该文件。' }))
    .finally(() => inflight.delete(key));
  inflight.set(key, read);
  return read;
}

export function prefetchRepoFile(path: string, snapshotId: string | undefined, fetchImpl: typeof fetch = fetch): void {
  if (!snapshotId) return;
  void readRepoFile(`${snapshotId}\0${path}`, path, snapshotId, fetchImpl);
}

export function useRepoFileText(
  path: string | null,
  snapshotId: string | undefined,
  fetchImpl: typeof fetch = fetch,
): RepoFileText {
  const key = path && snapshotId ? `${snapshotId}\0${path}` : null;
  const [held, setHeld] = useState<{ key: string | null; text: RepoFileText }>(() => ({ key, text: (key && cache.get(key)) || { status: 'loading' } }));
  const setState = (text: RepoFileText) => setHeld({ key, text });

  useEffect(() => {
    if (!key || !path || !snapshotId) return;
    const cached = cache.get(key);
    if (cached) {
      setState(cached);
      return;
    }
    setState({ status: 'loading' });
    let live = true;
    void readRepoFile(key, path, snapshotId, fetchImpl).then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, [key, path, snapshotId, fetchImpl]);

  if (!key) return { status: 'loading' };
  if (held.key === key) return held.text;
  return cache.get(key) ?? { status: 'loading' };
}

/** What a tab says when a file has no text to show. */
export function repoFileEmptyMessage(reason: RepoFileNoContentReason, size?: number): string {
  switch (reason) {
    case 'too-large':
      return size ? `Too large to show (${(size / 1024 / 1024).toFixed(1)} MB; the limit is 5 MB).` : '文件过大，无法显示（上限为 5 MB）。';
    case 'binary':
      return '二进制文件：没有可显示为文本的内容。';
    case 'missing':
      return '此文件已不存在（或是一个链接）。';
    default:
      return '平台未返回此文件（超过 1 MB 的文件在没有本地检出时不会提供）。';
  }
}

/** Tests only. */
export function __clearRepoFileTextCache() {
  cache.clear();
  inflight.clear();
}
