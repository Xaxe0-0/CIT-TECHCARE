'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';

// Last response per path for this tab, so revisiting a page shows it at once while it refreshes.
// Signed-in data lives here too, so the shell clears it whenever the session changes.
// ponytail: whole-response cache capped by entry count; add per-path expiry if memory matters.
const cache = new Map<string, unknown>();
const CACHE_LIMIT = 60;
export function clearDataCache() {
  cache.clear();
}
function remember(path: string, value: unknown) {
  cache.delete(path);
  cache.set(path, value);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
}

// A null path keeps optional UI from fetching before the user needs it.
export function useData<T>(path: string | null, version = 0, pollMs = 0) {
  const cached = path === null ? undefined : (cache.get(path) as T | undefined);
  const [data, setData] = useState<T | null>(cached ?? null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(path !== null && cached === undefined),
    [retry, setRetry] = useState(0),
    [realtimeVersion, setRealtimeVersion] = useState(0);
  const previousPath = useRef(path);
  const hasData = useRef(cached !== undefined);
  useEffect(() => {
    if (path === null) {
      hasData.current = false;
      setData(null);
      setError('');
      setLoading(false);
      return;
    }
    if (previousPath.current !== path) {
      const saved = cache.get(path) as T | undefined;
      hasData.current = saved !== undefined;
      setData(saved ?? null);
      previousPath.current = path;
    }
    const controller = new AbortController();
    // Refreshes keep the current content on screen; only a first load shows the loading state.
    if (!hasData.current) setLoading(true);
    setError('');
    api<T>(path, undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        hasData.current = true;
        remember(path, result);
        setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version, retry, realtimeVersion]);
  useEffect(() => {
    if (path === null) return;
    const invalidate = () => setRealtimeVersion((value) => value + 1);
    window.addEventListener('techcare-invalidate', invalidate);
    return () => window.removeEventListener('techcare-invalidate', invalidate);
  }, [path]);
  useEffect(() => {
    if (path === null || !pollMs) return;
    let active = true;
    let running = false;
    const controller = new AbortController();
    const poll = async () => {
      if (!active || running || document.hidden) return;
      running = true;
      try {
        const next = await api<T>(path, undefined, controller.signal);
        if (active) {
          remember(path, next);
          setData(next);
          setError('');
        }
      } catch (failure) {
        if ((failure as Error).name !== 'AbortError') {
          // Keep the last useful queue visible during a temporary connection issue.
        }
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(poll, pollMs);
    const onFocus = () => void poll();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [path, version, pollMs]);
  return { data, error, loading, reload: () => setRetry((n) => n + 1) };
}
