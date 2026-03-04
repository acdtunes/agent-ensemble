/**
 * ArchiveConfirmDialog - Confirmation modal for feature archiving
 *
 * Pure presentational component. Receives all state and callbacks via props.
 * Follows existing dialog patterns (AddProjectDialog).
 */

// --- Props type ---

export interface ArchiveConfirmDialogProps {
  readonly featureName: string;
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}

// --- Component ---

export const ArchiveConfirmDialog = ({
  featureName,
  isOpen,
  onConfirm,
  onCancel,
  loading = false,
}: ArchiveConfirmDialogProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-md rounded-lg border border-gray-700 bg-gray-900 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-200">Archive Feature?</h3>
        <p className="mb-2 text-sm text-gray-300">
          Are you sure you want to archive "{featureName}"?
        </p>
        <p className="mb-4 text-xs text-gray-400">
          The feature will be moved to the archive and can be restored later.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded px-3 py-1 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
};
