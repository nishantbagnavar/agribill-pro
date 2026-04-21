import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { printerApi } from '../api/printer.api.js';
import toast from 'react-hot-toast';

export function usePrinterConfig() {
  return useQuery({
    queryKey: ['printer-config'],
    queryFn: () => printerApi.getConfig().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useSavePrinterConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config) => printerApi.saveConfig(config),
    onSuccess: () => {
      toast.success('Printer saved');
      qc.invalidateQueries(['printer-config']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to save printer config'),
  });
}

export function useClearPrinterConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => printerApi.clearConfig(),
    onSuccess: () => {
      toast.success('Printer disconnected');
      qc.invalidateQueries(['printer-config']);
    },
  });
}

export function useDiscoverPrinters() {
  return useMutation({
    mutationFn: () => printerApi.discover().then((r) => r.data.data),
    onError: () => toast.error('Discovery failed'),
  });
}

export function useOsPrinters() {
  return useMutation({
    mutationFn: () => printerApi.getOsPrinters().then((r) => r.data.data),
    onError: () => toast.error('Failed to list system printers'),
  });
}

export function useTestPrint() {
  return useMutation({
    mutationFn: (config) => printerApi.testPrint(config),
    onSuccess: () => toast.success('Test page sent to printer'),
    onError: (e) => toast.error(e?.response?.data?.error || 'Printer not reachable'),
  });
}

export function usePrintBill() {
  return useMutation({
    mutationFn: (billId) => printerApi.printBill(billId),
    onSuccess: () => toast.success('Bill sent to printer'),
    onError: (e) => toast.error(e?.response?.data?.error || 'Print failed'),
  });
}
