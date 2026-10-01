import { useEffect, useRef, useState } from 'react';
import { copyText } from './clipboard';

export default function useCopyFeedback() {
  const [feedback, setFeedback] = useState({ id: null, message: '' });
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const copy = async (id, value, label) => {
    try {
      await copyText(value);
      if (!mountedRef.current) return;
      setFeedback({ id, message: `${label}已复制` });
    } catch {
      if (!mountedRef.current) return;
      setFeedback({ id: null, message: '暂时无法复制' });
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback({ id: null, message: '' }), 3000);
  };

  return { copy, feedback };
}
