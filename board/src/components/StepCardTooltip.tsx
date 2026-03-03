import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { StepCardData } from '../utils/statusMapping';

const TOOLTIP_DELAY_MS = 300;

interface StepCardTooltipProps {
  readonly card: StepCardData;
  readonly children: ReactNode;
}

const pluralize = (count: number, singular: string, plural: string): string =>
  count === 1 ? `${count} ${singular}` : `${count} ${plural}`;

export const StepCardTooltip = ({
  card,
  children,
}: StepCardTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearPendingTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, TOOLTIP_DELAY_MS);
  }, [clearPendingTimeout]);

  const handleMouseLeave = useCallback(() => {
    clearPendingTimeout();
    setIsVisible(false);
  }, [clearPendingTimeout]);

  useEffect(() => {
    return clearPendingTimeout;
  }, [clearPendingTimeout]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded border border-gray-700 bg-gray-800 p-3 text-sm shadow-lg"
        >
          <div className="font-medium text-gray-100">{card.stepName}</div>

          {card.files.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-400">Files</div>
              <ul className="mt-1 space-y-0.5">
                {card.files.map((file) => (
                  <li key={file} className="text-xs text-gray-300">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex gap-4 text-xs text-gray-400">
            <span>{pluralize(card.dependencyCount, 'dependency', 'dependencies')}</span>
            <span>{pluralize(card.reviewCount, 'review', 'reviews')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
