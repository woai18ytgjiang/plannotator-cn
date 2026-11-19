// Modified 2026-11-19 for the unofficial Plannotator Simplified Chinese localization fork; see ATTRIBUTION.md at the repository root.
export type FileStatusKey = 'added' | 'deleted' | 'renamed' | 'modified' | 'binary' | 'untracked';

export interface FileStatusLetter {
  letter: string;
  title: string;
  className: string;
}

const NEUTRAL = 'font-medium text-muted-foreground';

const LETTERS: Record<FileStatusKey, FileStatusLetter> = {
  added: { letter: 'A', title: '新增文件', className: 'font-medium text-success' },
  deleted: { letter: 'D', title: '删除文件', className: 'font-medium text-destructive' },
  renamed: { letter: 'R', title: '重命名文件', className: NEUTRAL },
  modified: { letter: 'M', title: '修改文件', className: NEUTRAL },
  binary: { letter: 'B', title: '二进制文件', className: NEUTRAL },
  untracked: { letter: 'U', title: '未跟踪文件', className: NEUTRAL },
};

export function fileStatusLetter(status: string, options: { oldPath?: string; untracked?: boolean } = {}): FileStatusLetter {
  const key: FileStatusKey = options.untracked ? 'untracked' : status in LETTERS ? (status as FileStatusKey) : 'modified';
  const meta = LETTERS[key];
  if (key === 'renamed' && options.oldPath) return { ...meta, title: `重命名自 ${options.oldPath}` };
  return meta;
}
