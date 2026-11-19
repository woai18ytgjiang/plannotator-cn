import { useEffect, useState } from 'react';

export type OriginalFileText =
  | { status: 'loading' }
  | { status: 'ready'; content: string }
  | { status: 'none'; message: string }
  | { status: 'error'; message: string };

export function useOriginalFileText(
  path: string,
  oldPath: string | undefined,
  base: string | undefined,
  snapshotId: string | undefined,
  fetchImpl: typeof fetch = fetch,
): OriginalFileText {
  const [state, setState] = useState<OriginalFileText>({ status: 'loading' });
  useEffect(() => {
    setState({ status: 'loading' });
    const controller = new AbortController();
    const params = new URLSearchParams({ path });
    if (oldPath) params.set('oldPath', oldPath);
    if (base) params.set('base', base);
    if (snapshotId) params.set('snapshot', snapshotId);
    fetchImpl(`/api/file-content?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { oldContent?: string | null; error?: string };
        if (controller.signal.aborted) return;
        if (!response.ok) setState({ status: 'error', message: body.error ?? `HTTP ${response.status}` });
        else if (typeof body.oldContent === 'string') setState({ status: 'ready', content: body.oldContent });
        else setState({ status: 'none', message: '这是新文件：没有原始版本。' });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : '无法读取原始版本。' });
      });
    return () => controller.abort();
  }, [path, oldPath, base, snapshotId, fetchImpl]);
  return state;
}
