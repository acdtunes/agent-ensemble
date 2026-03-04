// --- Types ---

interface ToastProps {
  readonly message: string | null;
}

// --- Component ---

export const Toast = ({ message }: ToastProps) => {
  if (message === null) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-100 shadow-lg"
    >
      {message}
    </div>
  );
};
