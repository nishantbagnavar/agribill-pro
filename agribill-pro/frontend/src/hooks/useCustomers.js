import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../api/customers.api.js';
import toast from 'react-hot-toast';

export function useCustomers(params) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getAll(params).then((r) => ({
      rows: r.data.data,
      total: r.data.pagination?.total ?? r.data.data?.length ?? 0,
    })),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getById(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCustomerLedger(id) {
  return useQuery({
    queryKey: ['customers', id, 'ledger'],
    queryFn: () => customersApi.getLedger(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => customersApi.create(data).then((r) => r.data.data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['customers'] });
      toast.success('Customer added');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save customer'),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => customersApi.update(id, data).then((r) => r.data.data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['customers'] });
      toast.success('Customer updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update customer'),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove customer'),
  });
}
