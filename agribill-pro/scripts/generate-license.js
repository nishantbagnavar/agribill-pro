#!/usr/bin/env node
// Usage: node scripts/generate-license.js "Ravi Agro Store" "Pune"
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require(path.resolve(__dirname, '../backend/node_modules/@supabase/supabase-js'));

const [, , shopName, city, ownerName, phone] = process.argv;

if (!shopName || !city) {
  console.error('Usage: node scripts/generate-license.js "Shop Name" "City" ["Owner Name"] ["Phone"]');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generateLicenseKey() {
  const year = new Date().getFullYear();

  // Get current max shop number to generate next sequential key
  const { data: existing } = await supabase
    .from('shops')
    .select('license_key')
    .like('license_key', `AGR-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (existing && existing.length > 0) {
    const last = existing[0].license_key; // AGR-2024-SHOP047
    const match = last.match(/SHOP(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `AGR-${year}-SHOP${String(nextNum).padStart(3, '0')}`;
}

async function main() {
  const licenseKey = await generateLicenseKey();

  const { data, error } = await supabase.from('shops').insert({
    license_key: licenseKey,
    shop_name: shopName,
    city,
    owner_name: ownerName || null,
    phone: phone || null,
    status: 'trial',
    plan: 'basic',
    features: JSON.stringify(['billing', 'inventory', 'customers']),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day trial
  }).select().single();

  if (error) {
    console.error('Failed to insert into Supabase:', error.message);
    process.exit(1);
  }

  console.log('\n✅ License created successfully!\n');
  console.log(`  License Key : ${licenseKey}`);
  console.log(`  Shop        : ${shopName}`);
  console.log(`  City        : ${city}`);
  console.log(`  Plan        : basic (trial — 30 days)`);
  console.log(`  Expires     : ${new Date(data.expires_at).toLocaleDateString('en-IN')}`);
  console.log(`  Supabase ID : ${data.id}`);
  console.log('\n  Share this key with the shopkeeper:');
  console.log(`\n  ┌─────────────────────────────────┐`);
  console.log(`  │  ${licenseKey.padEnd(31)} │`);
  console.log(`  └─────────────────────────────────┘\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
