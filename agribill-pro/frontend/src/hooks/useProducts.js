import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products.api.js';
import { categoriesApi } from '../api/categories.api.js';
import toast from 'react-hot-toast';

export function useProducts(params) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params).then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.getById(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => productsApi.create(data).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product added'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => productsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productsApi.adjustStock(id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Stock updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to adjust stock'),
  });
}

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }) => productsApi.createVariant(productId, data).then((r) => r.data.data),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['products', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Pack size added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add variant'),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, data }) => productsApi.updateVariant(variantId, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Pack size updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update variant'),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId) => productsApi.deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Pack size removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove variant'),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => categoriesApi.create(data).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category added'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category updated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });
}
