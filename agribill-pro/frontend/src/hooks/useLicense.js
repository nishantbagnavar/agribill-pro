import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLicenseStatus, activateLicense, verifyLicense, resetHwid, getLanQr } from '../api/license.api';

export function useLicenseStatus() {
  return useQuery({ queryKey: ['license-status'], queryFn: getLicenseStatus, retry: false });
}

export function useActivateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: activateLicense,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['license-status'] }),
  });
}

export function useVerifyLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyLicense,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['license-status'] }),
  });
}

export function useResetHwid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resetHwid,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['license-status'] }),
  });
}

export function useLanQr() {
  return useQuery({ queryKey: ['lan-qr'], queryFn: getLanQr, staleTime: 5 * 60 * 1000 });
}
