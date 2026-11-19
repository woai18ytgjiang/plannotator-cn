import React from 'react';
import { Button } from '@plannotator/ui/components/ui/button';

export function FolderAnnotationEmptyState({
  compactTouchLayout,
  onChooseFile,
}: {
  compactTouchLayout: boolean;
  onChooseFile: () => void;
}) {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-3xl p-12 text-center text-muted-foreground">
        <p className="text-lg font-medium mb-2">选择一个文件开始批注</p>
        <p className="text-sm">
          {compactTouchLayout
            ? '选择一个 Markdown、文本、HTML 或图表文件开始。'
            : '从侧边栏选择一个 Markdown、HTML 或图表文件开始。'}
        </p>
        {compactTouchLayout && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={onChooseFile}
          >
            选择文件
          </Button>
        )}
      </div>
    </div>
  );
}
