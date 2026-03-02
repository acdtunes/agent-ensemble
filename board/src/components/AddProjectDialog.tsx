import { useState } from 'react';

interface AddProjectDialogProps {
  readonly onSubmit: (projectPath: string) => void;
  readonly onCancel: () => void;
  readonly submitting: boolean;
  readonly error: string | null;
}

export const AddProjectDialog = ({ onSubmit, onCancel, submitting, error }: AddProjectDialogProps) => {
  const [path, setPath] = useState('');
  const canSubmit = path.trim().length > 0 && !submitting;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-200">Add Project</h3>
      <label htmlFor="project-path" className="block text-xs text-gray-400 mb-1">
        Project path
      </label>
      <input
        id="project-path"
        type="text"
        aria-label="Project path"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="/path/to/project"
        className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      {error !== null && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(path.trim())}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
};
