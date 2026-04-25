import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../api/billing.api.js';
import toast from 'react-hot-toast';

export function useBills(params) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => billingApi.getBills(params).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useBill(id) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billingApi.getBillById(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useNextBillNumber() {
  return useQuery({
    queryKey: ['next-bill-number'],
    queryFn: () => billingApi.getNextBillNumber().then((r) => r.data.data),
    staleTime: 0,
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => billingApi.createBill(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['next-bill-number'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to create bill'),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => billingApi.recordPayment(id, data).then((r) => r.data.data),
    onSuccess: async (data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bills'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['customers'] }),
      ]);
      await qc.refetchQueries({ queryKey: ['bills'] });
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });
}
