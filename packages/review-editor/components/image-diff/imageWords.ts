import { MAX_REVIEW_IMAGE_PREVIEW_LABEL } from '@plannotator/shared/diff-paths';
import { formatImageBytes, type ReviewImageError } from '../../utils/reviewImage';
import type { Size } from './geometry';

export function describeImageError(error: Pick<ReviewImageError, 'reason' | 'bytes' | 'width' | 'height'>): string {
  switch (error.reason) {
    case 'lfs-pointer':
      return '存储在 Git LFS 中';
    case 'not-image':
      return '不是可识别的图片格式';
    case 'decode':
      return '无法解码';
    case 'too-large':
      if (error.width && error.height) return `${error.width} × ${error.height} px is over the preview limit`;
      return `larger than ${MAX_REVIEW_IMAGE_PREVIEW_LABEL}${error.bytes ? ` (${formatImageBytes(error.bytes)})` : ''}`;
    case 'missing':
      return '在此版本中不存在';
    case 'stale':
      return '差异已变更，请刷新审查';
    case 'network':
      return '无法连接到服务器';
    default:
      return '无法加载';
  }
}

export function imageCaption(label: string | null, size: Size | null, bytes: number): string {
  return [label, size ? `${size.width} × ${size.height}` : null, formatImageBytes(bytes)].filter(Boolean).join(' · ');
}

function signed(value: number, text: string): string {
  return `${value > 0 ? '+' : '−'}${text}`;
}

export function sizeChange(before: Size | null, after: Size | null, beforeBytes: number, afterBytes: number): string {
  const parts: string[] = [];
  if (before && after && before.width !== after.width) parts.push(`${signed(after.width - before.width, String(Math.abs(after.width - before.width)))} wide`);
  if (before && after && before.height !== after.height) parts.push(`${signed(after.height - before.height, String(Math.abs(after.height - before.height)))} tall`);
  const bytes = afterBytes - beforeBytes;
  parts.push(bytes === 0 ? '大小相同' : signed(bytes, formatImageBytes(Math.abs(bytes))));
  return `(${parts.join(', ')})`;
}
