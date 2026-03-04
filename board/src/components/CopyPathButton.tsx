import { useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';

// --- Types ---

type CopyState = 'idle' | 'copied' | 'fallback';

interface CopyPathButtonProps {
  readonly filePath: string | null;
}

// --- Pure helpers ---

const stripAbsolutePrefix = (path: string): string =>
  path.replace(/^(?:\/Users\/.*?\/|C:\\.*?\\)/, '');

// --- Component ---

export const CopyPathButton = ({ filePath }: CopyPathButtonProps) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef<HTMLSpanElement>(null);

  const resetAfterDelay = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopyState('idle');
      timerRef.current = null;
    }, 2000);
  }, []);

  const selectPathText = useCallback(() => {
    if (pathRef.current === null) return;
    const range = document.createRange();
    range.selectNodeContents(pathRef.current);
    const selection = window.getSelection();
    if (selection !== null) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  const handleCopy = useCallback(() => {
    if (filePath === null || copyState === 'copied') return;

    const relativePath = stripAbsolutePrefix(filePath);

    flushSync(() => { setCopyState('copied'); });
    resetAfterDelay();

    navigator.clipboard.writeText(relativePath).catch(() => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flushSync(() => { setCopyState('fallback'); });
      selectPathText();
    });
  }, [filePath, copyState, resetAfterDelay, selectPathText]);

  if (filePath === null) return null;

  const relativePath = stripAbsolutePrefix(filePath);

  const buttonLabel =
    copyState === 'copied' ? 'Copied!' :
    copyState === 'fallback' ? 'Select & copy manually' :
    'Copy path';

  return (
    <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-2 text-sm">
      <span ref={pathRef} className="font-mono text-gray-300">{relativePath}</span>
      <button
        className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-600"
        onClick={handleCopy}
      >
        {buttonLabel}
      </button>
    </div>
  );
};
