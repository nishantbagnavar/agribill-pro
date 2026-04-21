import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApi } from '../api/backup.api.js';
import toast from 'react-hot-toast';

export function useBackupStatus() {
  return useQuery({
    queryKey: ['backup-status'],
    queryFn: () => backupApi.getStatus().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useSnapshots() {
  return useQuery({
    queryKey: ['backup-snapshots'],
    queryFn: () => backupApi.listSnapshots().then((r) => r.data.data),
    staleTime: 60_000,
    enabled: false,
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label) => backupApi.createSnapshot(label),
    onSuccess: () => {
      toast.success('Backup created successfully');
      qc.invalidateQueries(['backup-status']);
      qc.invalidateQueries(['backup-snapshots']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Backup failed'),
  });
}

export function useRestoreSnapshot() {
  return useMutation({
    mutationFn: (key) => backupApi.restoreSnapshot(key),
    onError: (e) => toast.error(e?.response?.data?.error || 'Restore failed'),
  });
}

export function useListSnapshots() {
  return useMutation({
    mutationFn: () => backupApi.listSnapshots().then((r) => r.data.data),
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to load backups'),
  });
}
