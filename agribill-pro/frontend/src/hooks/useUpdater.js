import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { updaterApi } from '../api/updater.api.js';

export function useUpdateCheck() {
  return useQuery({
    queryKey: ['updater', 'check'],
    queryFn: updaterApi.check,
    staleTime: 1000 * 60 * 30, // recheck every 30 min
    retry: false,
  });
}

export function useDownloadUpdate() {
  const [state, setState] = useState({ status: 'idle', percent: 0, downloaded: 0, total: 0, sha256: '', version: '' });
  const esRef = useRef(null);

  const start = useCallback(() => {
    if (esRef.current) esRef.current.close();

    setState({ status: 'downloading', percent: 0, downloaded: 0, total: 0, sha256: '', version: '' });

    const es = updaterApi.startDownload();
    esRef.current = es;

    es.addEventListener('start', (e) => {
      const d = JSON.parse(e.data);
      setState((s) => ({ ...s, total: d.size, version: d.version }));
    });

    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      setState((s) => ({ ...s, percent: d.percent, downloaded: d.downloaded, total: d.total }));
    });

    es.addEventListener('done', (e) => {
      const d = JSON.parse(e.data);
      setState({ status: 'done', percent: 100, downloaded: 0, total: 0, sha256: d.sha256 || '', version: d.version || '' });
      es.close();
    });

    es.addEventListener('error', (e) => {
      let msg = 'Download failed';
      try { msg = JSON.parse(e.data).message || msg; } catch { /* raw error event */ }
      setState((s) => ({ ...s, status: 'error', error: msg }));
      es.close();
    });
  }, []);

  const cancel = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setState({ status: 'idle', percent: 0, downloaded: 0, total: 0, sha256: '', version: '' });
  }, []);

  return { ...state, start, cancel };
}

export function useApplyUpdate() {
  return useMutation({ mutationFn: (sha256) => updaterApi.apply(sha256) });
}
