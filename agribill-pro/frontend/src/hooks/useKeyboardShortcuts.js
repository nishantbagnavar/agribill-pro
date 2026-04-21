import { useEffect, useRef } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const handler = (e) => {
      const cb = ref.current[e.key];
      if (cb) {
        e.preventDefault();
        cb(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
