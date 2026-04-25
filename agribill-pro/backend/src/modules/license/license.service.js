const { sqlite } = require('../../config/db');
const { getHwid } = require('./hwid');
const { createGraceToken, verifyGraceToken } = require('./grace');
const { getSupabaseClient } = require('./supabase.client');

function getSecret() {
  return process.env.LICENSE_HMAC_SECRET || 'dev-license-secret-change-in-prod';
}

function getCachedLicense() {
  return sqlite.prepare('SELECT * FROM license_cache ORDER BY id DESC LIMIT 1').get();
}

// Persist the license key even when cache is wiped (for auto-recovery)
function saveLastKnownKey(key) {
  sqlite.prepare(`INSERT INTO app_config (key, value) VALUES ('last_license_key', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key);
}
function getLastKnownKey() {
  const row = sqlite.prepare(`SELECT value FROM app_config WHERE key = 'last_license_key'`).get();
  return row?.value || null;
}

function isLicenseValid() {
  const cached = getCachedLicense();
  if (!cached) return false;
  return !!verifyGraceToken(cached.grace_token, getSecret());
}

function parseFeatures(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function activateLicense(licenseKey) {
  const hwid = getHwid();
  const supabase = getSupabaseClient();
  if (!supabase) throw Object.assign(new Error('License server not configured'), { statusCode: 503 });

  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('license_key', licenseKey)
    .single();

  if (error || !shop) throw Object.assign(new Error('Invalid license key'), { statusCode: 400 });
  if (!['active', 'trial'].includes(shop.status))
    throw Object.assign(new Error(`License is ${shop.status}`), { statusCode: 403 });
  if (shop.expires_at && new Date(shop.expires_at) < new Date())
    throw Object.assign(new Error('License has expired'), { statusCode: 403 });

  if (shop.hwid && shop.hwid !== hwid) {
    throw Object.assign(
      new Error('License is bound to a different device. Use reset-hwid if you changed hardware.'),
      { statusCode: 409 }
    );
  }

  const now = new Date().toISOString();
  if (!shop.hwid) {
    await supabase.from('shops').update({ hwid, last_seen_at: now }).eq('license_key', licenseKey);
  } else {
    await supabase.from('shops').update({ last_seen_at: now }).eq('license_key', licenseKey);
  }

  const graceToken = createGraceToken(
    { licenseKey, hwid, plan: shop.plan, customerName: shop.owner_name },
    getSecret()
  );

  const featuresJson = typeof shop.features === 'string' ? shop.features : JSON.stringify(shop.features || {});

  saveLastKnownKey(licenseKey); // persist key for auto-recovery after suspension
  sqlite.prepare('DELETE FROM license_cache').run();
  sqlite.prepare(`
    INSERT INTO license_cache (license_key, hwid, plan, customer_name, expires_at, features, grace_token, activated_at, last_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(licenseKey, hwid, shop.plan, shop.owner_name || '', shop.expires_at || null, featuresJson, graceToken);

  return { plan: shop.plan, customerName: shop.owner_name, expiresAt: shop.expires_at, features: parseFeatures(featuresJson) };
}

async function verifyLicense() {
  const cached = getCachedLicense();
  if (!cached) throw Object.assign(new Error('No license activated'), { statusCode: 402 });

  const hwid = getHwid();
  if (cached.hwid !== hwid) throw Object.assign(new Error('Hardware mismatch'), { statusCode: 409 });

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('hwid, plan, owner_name, expires_at, status, features')
      .eq('license_key', cached.license_key)
      .single();

    if (!error && shop && ['active', 'trial'].includes(shop.status) && shop.hwid === hwid) {
      const graceToken = createGraceToken(
        { licenseKey: cached.license_key, hwid, plan: shop.plan, customerName: shop.owner_name },
        getSecret()
      );
      const featuresJson = typeof shop.features === 'string' ? shop.features : JSON.stringify(shop.features || {});
      sqlite.prepare(`
        UPDATE license_cache
        SET grace_token = ?, plan = ?, expires_at = ?, features = ?, last_verified_at = datetime('now')
        WHERE id = ?
      `).run(graceToken, shop.plan, shop.expires_at || null, featuresJson, cached.id);
      await supabase.from('shops').update({ last_seen_at: new Date().toISOString() }).eq('license_key', cached.license_key);
      return { online: true, plan: shop.plan, features: parseFeatures(featuresJson) };
    }

    // Online but invalid — wipe cache
    if (!error && shop && (!['active', 'trial'].includes(shop.status) || (shop.expires_at && new Date(shop.expires_at) < new Date()))) {
      sqlite.prepare('DELETE FROM license_cache').run();
      throw Object.assign(new Error(`License is ${shop.status || 'expired'}`), { statusCode: 403 });
    }
  }

  // Offline fallback: check HMAC-signed grace token
  const payload = verifyGraceToken(cached.grace_token, getSecret());
  if (!payload) throw Object.assign(new Error('License grace period expired. Connect to internet to verify.'), { statusCode: 402 });

  return { online: false, plan: payload.plan };
}

async function resetHwid(licenseKey) {
  const supabase = getSupabaseClient();
  if (!supabase) throw Object.assign(new Error('License server not configured'), { statusCode: 503 });

  const { data: shop, error } = await supabase
    .from('shops')
    .select('hwid, hwid_reset_count, hwid_reset_year, hwid_reset_history, status')
    .eq('license_key', licenseKey)
    .single();

  if (error || !shop) throw Object.assign(new Error('Invalid license key'), { statusCode: 400 });
  if (!['active', 'trial'].includes(shop.status))
    throw Object.assign(new Error(`License is ${shop.status}`), { statusCode: 403 });

  const currentYear = new Date().getFullYear();
  const resetCount = shop.hwid_reset_year === currentYear ? (shop.hwid_reset_count ?? 0) : 0;

  if (resetCount >= 2)
    throw Object.assign(new Error('HWID reset quota exhausted (2 per year). Contact support for manual reset.'), { statusCode: 403 });

  const history = JSON.parse(shop.hwid_reset_history || '[]');
  if (shop.hwid) {
    history.push({ hwid: shop.hwid, reset_at: new Date().toISOString(), type: 'self-service' });
  }

  await supabase.from('shops').update({
    hwid: null,
    hwid_reset_count: resetCount + 1,
    hwid_reset_year: currentYear,
    hwid_reset_history: JSON.stringify(history),
  }).eq('license_key', licenseKey);

  sqlite.prepare('DELETE FROM license_cache').run();

  return { resetsUsed: resetCount + 1, resetsRemaining: 2 - (resetCount + 1) };
}

function getLicenseStatus() {
  const cached = getCachedLicense();
  if (!cached) return { activated: false };

  const hwid = getHwid();
  const payload = verifyGraceToken(cached.grace_token, getSecret());

  return {
    activated: !!payload,
    plan: cached.plan,
    customerName: cached.customer_name,
    expiresAt: cached.expires_at,
    lastVerified: cached.last_verified_at ? cached.last_verified_at.replace(' ', 'T') + 'Z' : null,
    hwid: hwid.slice(0, 8) + '...',
    graceValid: !!payload,
    graceExpiresAt: payload ? new Date(payload.expiresAt).toISOString() : null,
    features: parseFeatures(cached.features),
  };
}

// Runs on startup + every 60s — syncs status/plan/expiry/features from Supabase
async function backgroundVerify() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Auto-recovery: if cache is empty but we have a stored key, try to re-activate silently
  const cached = getCachedLicense();
  if (!cached) {
    const lastKey = getLastKnownKey();
    if (lastKey) {
      try {
        await activateLicense(lastKey);
        console.log('✅ License auto-recovered after suspension/expiry');
      } catch (e) {
        // Still suspended/expired — stay locked, try again next cycle
      }
    }
    return;
  }

  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('hwid, plan, status, expires_at, features')
      .eq('license_key', cached.license_key)
      .single();

    if (error || !shop) return;

    const suspended = !['active', 'trial'].includes(shop.status);
    const expired = shop.expires_at && new Date(shop.expires_at) < new Date();

    if (suspended || expired) {
      sqlite.prepare('DELETE FROM license_cache').run();
      console.log(`⛔ License ${suspended ? 'suspended' : 'expired'} — local cache cleared`);
    } else {
      const hwid = getHwid();
      const graceToken = createGraceToken(
        { licenseKey: cached.license_key, hwid, plan: shop.plan, customerName: cached.customer_name },
        getSecret()
      );
      const featuresJson = typeof shop.features === 'string' ? shop.features : JSON.stringify(shop.features || {});
      sqlite.prepare(`
        UPDATE license_cache
        SET grace_token = ?, plan = ?, expires_at = ?, features = ?, last_verified_at = datetime('now')
        WHERE id = ?
      `).run(graceToken, shop.plan, shop.expires_at || null, featuresJson, cached.id);
    }
  } catch (e) {
    // Network failure — leave cache as-is, grace token handles offline
  }
}

function startLicenseVerificationCron() {
  backgroundVerify(); // run once on startup
  setInterval(backgroundVerify, 60 * 1000); // re-check every 60 seconds
}

module.exports = { activateLicense, verifyLicense, resetHwid, getLicenseStatus, isLicenseValid, startLicenseVerificationCron };
