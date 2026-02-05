/**
 * LoadingBar - Global loading indicator at top of page
 * Usage: <LoadingBar /> - automatically shows when React Query is fetching
 */
import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function LoadingBar() {
  const isFetching = useIsFetching();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isFetching > 0) {
      setVisible(true);
      setProgress(30);

      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 300);

      return () => clearInterval(timer);
    } else {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(hideTimer);
    }
  }, [isFetching]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50 bg-gray-200 dark:bg-gray-700"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading content"
    >
      <div
        className="h-full bg-blue-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
