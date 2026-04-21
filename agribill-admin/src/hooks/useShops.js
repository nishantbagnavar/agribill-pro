import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import toast from 'react-hot-toast';

const SAFE_COLS = `
  id, license_key, shop_name, owner_name, owner_email, phone, city,
  plan, status, features, expires_at, app_version, notes,
  hwid, hwid_reset_count, hwid_reset_year, hwid_reset_history,
  created_at, last_seen_at, bills_count
`;

export function useShops(filter = 'all') {
  return useQuery({
    queryKey: ['shops', filter],
    queryFn: async () => {
      let q = supabase.from('shops').select(SAFE_COLS).order('last_seen_at', { ascending: false, nullsFirst: false });
      if (filter === 'active')    q = q.eq('status', 'active');
      if (filter === 'suspended') q = q.eq('status', 'suspended');
      if (filter === 'expired')   q = q.eq('status', 'expired');
      if (filter === 'trial')     q = q.eq('status', 'trial');
      if (filter === 'offline') {
        const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
        q = q.lte('last_seen_at', threeDaysAgo).neq('status', 'suspended');
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useShop(id) {
  return useQuery({
    queryKey: ['shop', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('shops').select(SAFE_COLS).eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useShopStats() {
  return useQuery({
    queryKey: ['shop-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shops').select('status, expires_at');
      if (error) throw error;
      const total = data.length;
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 86_400_000);
      return {
        total,
        active: data.filter(s => s.status === 'active').length,
        suspended: data.filter(s => s.status === 'suspended').length,
        expiringThisMonth: data.filter(s => {
          if (!s.expires_at) return false;
          const exp = new Date(s.expires_at);
          return exp > now && exp <= thirtyDays;
        }).length,
      };
    },
  });
}

export function useUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('shops').update(updates)
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shop', vars.id] });
      qc.invalidateQueries({ queryKey: ['shops'] });
      qc.invalidateQueries({ queryKey: ['shop-stats'] });
      toast.success('Shop updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useCreateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shopData) => {
      const { data, error } = await supabase.from('shops').insert(shopData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shops'] });
      qc.invalidateQueries({ queryKey: ['shop-stats'] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useResetHWID() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentHwid, history }) => {
      const newHistory = JSON.parse(history || '[]');
      if (currentHwid) {
        newHistory.push({ hwid: currentHwid, reset_at: new Date().toISOString(), type: 'admin-manual' });
      }
      const { data, error } = await supabase
        .from('shops')
        .update({ hwid: null, hwid_reset_history: JSON.stringify(newHistory) })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shop', vars.id] });
      qc.invalidateQueries({ queryKey: ['shops'] });
      toast.success('HWID reset — shop can now activate on a new device');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useExtendLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentExpiry, days }) => {
      const base = currentExpiry && new Date(currentExpiry) > new Date()
        ? new Date(currentExpiry)
        : new Date();
      base.setDate(base.getDate() + days);
      const { data, error } = await supabase
        .from('shops')
        .update({ expires_at: base.toISOString(), status: 'active' })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shop', vars.id] });
      qc.invalidateQueries({ queryKey: ['shops'] });
      toast.success('License extended');
    },
    onError: (e) => toast.error(e.message),
  });
}
