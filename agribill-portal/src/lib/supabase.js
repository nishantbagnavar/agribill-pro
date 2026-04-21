import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(url, key);

const SAFE_FIELDS = 'shop_name,status,plan,features,expires_at,hwid_reset_count,hwid_reset_year,city';

export async function fetchShopByKey(licenseKey) {
  const { data, error } = await supabase
    .from('shops')
    .select(SAFE_FIELDS)
    .eq('license_key', licenseKey)
    .single();
  if (error) throw error;
  return data;
}

export async function selfResetHWID(licenseKey) {
  const { data: shop, error: fetchErr } = await supabase
    .from('shops')
    .select('id,hwid,hwid_reset_count,hwid_reset_year,hwid_reset_history')
    .eq('license_key', licenseKey)
    .single();

  if (fetchErr) throw fetchErr;

  const currentYear = new Date().getFullYear();
  const resetCount = shop.hwid_reset_year === currentYear ? (shop.hwid_reset_count ?? 0) : 0;

  if (resetCount >= 2) {
    return {
      allowed: false,
      message: 'You have used both self-service resets for this year. Please contact support.',
    };
  }

  const history = JSON.parse(shop.hwid_reset_history || '[]');
  if (shop.hwid) {
    history.push({ hwid: shop.hwid, reset_at: new Date().toISOString(), type: 'self-service' });
  }

  const { error: updateErr } = await supabase
    .from('shops')
    .update({
      hwid: null,
      hwid_reset_count: resetCount + 1,
      hwid_reset_year: currentYear,
      hwid_reset_history: JSON.stringify(history),
      updated_at: new Date().toISOString(),
    })
    .eq('id', shop.id);

  if (updateErr) throw updateErr;

  return { allowed: true, resetsRemaining: 2 - (resetCount + 1) };
}
