import { useEffect } from 'react';
import { useDirectoryBrowser } from '../hooks/useDirectoryBrowser';

interface DirectoryBrowserProps {
  readonly onSelect: (path: string) => void;
  readonly onCancel: () => void;
}

export const DirectoryBrowser = ({ onSelect, onCancel }: DirectoryBrowserProps) => {
  const { currentPath, entries, loading, error, navigateTo, navigateUp } = useDirectoryBrowser();

  useEffect(() => {
    navigateTo();
  }, [navigateTo]);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-200">
        {currentPath ?? 'Browse Directory'}
      </h3>

      {loading && <p className="text-sm text-gray-400">Loading...</p>}

      {error !== null && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}

      {!loading && error === null && (
        <ul className="space-y-1">
          {entries.map((entry) => (
            <li key={entry.path}>
              <button
                type="button"
                onClick={() => navigateTo(entry.path)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-gray-200 hover:bg-gray-800"
              >
                <span className="text-gray-400">{'\u{1F4C1}'}</span>
                <span>{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigateUp()}
          className="rounded px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Up
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={currentPath === null}
          onClick={() => currentPath !== null && onSelect(currentPath)}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select
        </button>
      </div>
    </div>
  );
};
