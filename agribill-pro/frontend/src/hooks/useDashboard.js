import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api.js';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSalesChart(period = '30d') {
  return useQuery({
    queryKey: ['dashboard', 'sales-chart', period],
    queryFn: () => dashboardApi.getSalesChart({ period }).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useTopProducts() {
  return useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => dashboardApi.getTopProducts().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'category-breakdown'],
    queryFn: () => dashboardApi.getCategoryBreakdown().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useRecentBills() {
  return useQuery({
    queryKey: ['dashboard', 'recent-bills'],
    queryFn: () => dashboardApi.getRecentBills().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => dashboardApi.getAlerts().then((r) => r.data.data),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
