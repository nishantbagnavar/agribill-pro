import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';

export function useGSTSummary(month) {
  return useQuery({
    queryKey: ['gst-summary', month],
    queryFn: () => api.get(`/reports/gst-summary?month=${month}&format=json`).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!month,
  });
}
