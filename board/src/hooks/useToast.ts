import { useState, useCallback, useRef } from 'react';

// --- Types ---

interface ToastState {
  readonly message: string | null;
  readonly show: (message: string) => void;
}

// --- Constants ---

const AUTO_DISMISS_MS = 2000;

// --- Hook ---

export const useToast = (): ToastState => {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((newMessage: string) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    setMessage(newMessage);

    timerRef.current = setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, AUTO_DISMISS_MS);
  }, []);

  return { message, show };
};
