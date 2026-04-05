/**
 * Retry wrapper for React.lazy dynamic imports.
 * When a deploy changes chunk hashes the old URLs 404 and return HTML,
 * causing "Failed to fetch dynamically imported module" errors.
 * This retries once after a short delay, and on second failure reloads the page.
 */
export function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): () => Promise<{ default: T }> {
  return () =>
    factory().catch((err) => {
      // Only retry once per session per module
      const key = `chunk_retry_${factory.toString().slice(0, 60)}`;
      const alreadyRetried = sessionStorage.getItem(key);
      if (!alreadyRetried) {
        sessionStorage.setItem(key, "1");
        // Small delay then retry
        return new Promise<{ default: T }>((resolve, reject) => {
          setTimeout(() => {
            factory().then(resolve).catch(() => {
              // On second failure, force reload to get fresh chunks
              window.location.reload();
              reject(err);
            });
          }, 1000);
        });
      }
      // Already retried — force reload
      window.location.reload();
      throw err;
    });
}
