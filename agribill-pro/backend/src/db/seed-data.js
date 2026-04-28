const { sqlite } = require('../config/db');

function runSeed(key, fn) {
  const done = sqlite.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
  if (done) return;
  try {
    fn();
    sqlite.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run(key, new Date().toISOString());
    console.log('  ✅ Seed applied:', key);
  } catch (e) {
    console.warn('  ⚠️  Seed failed:', key, e.message);
  }
}

function getCatId(name) {
  const row = sqlite.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  return row ? row.id : null;
}

// ── v1: Categories ────────────────────────────────────────────────────────────
function seedV1Categories() {
  const ins = sqlite.prepare(`
    INSERT OR IGNORE INTO categories (name, name_hindi, icon, sort_order, is_active)
    VALUES (@name, @name_hindi, @icon, @sort_order, 1)
  `);
  sqlite.transaction((rows) => rows.forEach(r => ins.run(r)))([
    { name: 'Fertilizers',             name_hindi: 'उर्वरक',             icon: 'leaf',        sort_order: 1  },
    { name: 'Pesticides',              name_hindi: 'कीटनाशक',            icon: 'bug',         sort_order: 2  },
    { name: 'Fungicides',              name_hindi: 'फफूंदनाशक',          icon: 'shield',      sort_order: 3  },
    { name: 'Herbicides',              name_hindi: 'खरपतवारनाशक',        icon: 'scissors',    sort_order: 4  },
    { name: 'Seeds',                   name_hindi: 'बीज',                 icon: 'wheat',       sort_order: 5  },
    { name: 'Bio Products',            name_hindi: 'जैव उत्पाद',          icon: 'recycle',     sort_order: 6  },
    { name: 'Micro Nutrients',         name_hindi: 'सूक्ष्म पोषक तत्व',  icon: 'flask-conical', sort_order: 7 },
    { name: 'Plant Growth Regulators', name_hindi: 'पादप वृद्धि नियामक', icon: 'trending-up', sort_order: 8  },
    { name: 'Irrigation',              name_hindi: 'सिंचाई',             icon: 'droplets',    sort_order: 9  },
    { name: 'Tools & Equipment',       name_hindi: 'कृषि उपकरण',         icon: 'wrench',      sort_order: 10 },
  ]);
}

// ── v2: Products ──────────────────────────────────────────────────────────────
function seedV2Products() {
  const ins = sqlite.prepare(`
    INSERT OR IGNORE INTO products (
      name, name_hindi, sku, category_id, brand, unit,
      purchase_price, selling_price, mrp,
      gst_rate, hsn_code, current_stock, min_stock_alert, is_active
    ) VALUES (
      @name, @name_hindi, @sku, @cat, @brand, @unit,
      @pp, @sp, @mrp, @gst, @hsn, 0, @msa, 1
    )
  `);
  const run = sqlite.transaction((rows) => rows.forEach(r => ins.run(r)));

  const fert  = getCatId('Fertilizers');
  const pest  = getCatId('Pesticides');
  const fung  = getCatId('Fungicides');
  const herb  = getCatId('Herbicides');
  const seed  = getCatId('Seeds');
  const bio   = getCatId('Bio Products');
  const micro = getCatId('Micro Nutrients');
  const pgr   = getCatId('Plant Growth Regulators');
  const irr   = getCatId('Irrigation');
  const tool  = getCatId('Tools & Equipment');

  run([
    // ── FERTILIZERS  (GST 0%) ──────────────────────────────────────────────
    { name: 'DAP 50 Kg',                    name_hindi: 'डीएपी 50 किग्रा',                  sku: 'FERT-DAP-50',      cat: fert,  brand: 'IFFCO',        unit: 'bag',  pp: 130000, sp: 135000, mrp: 140000, gst: 0,  hsn: '31053000', msa: 5  },
    { name: 'Urea 50 Kg',                   name_hindi: 'यूरिया 50 किग्रा',                  sku: 'FERT-UREA-50',     cat: fert,  brand: 'IFFCO',        unit: 'bag',  pp: 24000,  sp: 26700,  mrp: 28000,  gst: 0,  hsn: '31021000', msa: 10 },
    { name: 'NPK 10:26:26 50 Kg',           name_hindi: 'एनपीके 10:26:26 50 किग्रा',          sku: 'FERT-NPK-102626',  cat: fert,  brand: 'Coromandel',   unit: 'bag',  pp: 145000, sp: 155000, mrp: 165000, gst: 0,  hsn: '31053000', msa: 5  },
    { name: 'NPK 12:32:16 50 Kg',           name_hindi: 'एनपीके 12:32:16 50 किग्रा',          sku: 'FERT-NPK-123216',  cat: fert,  brand: 'Coromandel',   unit: 'bag',  pp: 148000, sp: 158000, mrp: 168000, gst: 0,  hsn: '31053000', msa: 5  },
    { name: 'NPK 19:19:19 1 Kg',            name_hindi: 'एनपीके 19:19:19 1 किग्रा',           sku: 'FERT-NPK-191919',  cat: fert,  brand: 'SQM',          unit: 'kg',   pp: 8000,   sp: 10000,  mrp: 12000,  gst: 0,  hsn: '31053000', msa: 10 },
    { name: 'SSP 50 Kg',                    name_hindi: 'सिंगल सुपर फॉस्फेट 50 किग्रा',       sku: 'FERT-SSP-50',      cat: fert,  brand: 'Coromandel',   unit: 'bag',  pp: 35000,  sp: 40000,  mrp: 45000,  gst: 0,  hsn: '31031000', msa: 5  },
    { name: 'MOP 50 Kg',                    name_hindi: 'म्यूरेट ऑफ पोटाश 50 किग्रा',        sku: 'FERT-MOP-50',      cat: fert,  brand: 'IFFCO',        unit: 'bag',  pp: 120000, sp: 130000, mrp: 140000, gst: 0,  hsn: '31042000', msa: 5  },
    { name: 'Ammonium Sulphate 50 Kg',      name_hindi: 'अमोनियम सल्फेट 50 किग्रा',           sku: 'FERT-AS-50',       cat: fert,  brand: 'GSFC',         unit: 'bag',  pp: 70000,  sp: 75000,  mrp: 80000,  gst: 0,  hsn: '31022100', msa: 5  },
    { name: 'CAN 50 Kg',                    name_hindi: 'कैल्शियम अमोनियम नाइट्रेट 50 किग्रा', sku: 'FERT-CAN-50',      cat: fert,  brand: 'GNFC',         unit: 'bag',  pp: 100000, sp: 108000, mrp: 115000, gst: 0,  hsn: '31022900', msa: 5  },

    // ── PESTICIDES  (GST 18%) ──────────────────────────────────────────────
    { name: 'Chlorpyrifos 20% EC 1 L',      name_hindi: 'क्लोरपायरीफॉस 20% ईसी 1 लीटर',      sku: 'PEST-CHL20-1L',    cat: pest,  brand: 'Dhanuka',      unit: 'ltr',  pp: 17000,  sp: 22000,  mrp: 26000,  gst: 18, hsn: '38081029', msa: 5  },
    { name: 'Imidacloprid 17.8% SL 1 L',    name_hindi: 'इमिडाक्लोप्रिड 17.8% एसएल 1 लीटर', sku: 'PEST-IMID-1L',     cat: pest,  brand: 'Bayer',        unit: 'ltr',  pp: 45000,  sp: 55000,  mrp: 65000,  gst: 18, hsn: '38081099', msa: 5  },
    { name: 'Cypermethrin 25% EC 500 ml',   name_hindi: 'सायपरमेथ्रिन 25% ईसी 500 मिली',     sku: 'PEST-CYP25-500',   cat: pest,  brand: 'Rallis',       unit: 'pcs',  pp: 9000,   sp: 12000,  mrp: 15000,  gst: 18, hsn: '38081019', msa: 5  },
    { name: 'Thiamethoxam 25% WG 100 g',    name_hindi: 'थियामेथोक्सम 25% डब्ल्यूजी 100 ग्राम', sku: 'PEST-THIA25-100', cat: pest,  brand: 'Syngenta',     unit: 'pcs',  pp: 30000,  sp: 38000,  mrp: 45000,  gst: 18, hsn: '38081099', msa: 5  },
    { name: 'Lambda Cyhalothrin 5% EC 1 L', name_hindi: 'लैम्बडा सायहेलोथ्रिन 5% ईसी 1 लीटर', sku: 'PEST-LAM5-1L',    cat: pest,  brand: 'Syngenta',     unit: 'ltr',  pp: 28000,  sp: 35000,  mrp: 42000,  gst: 18, hsn: '38081019', msa: 5  },
    { name: 'Acephate 75% SP 500 g',        name_hindi: 'एसीफेट 75% एसपी 500 ग्राम',          sku: 'PEST-ACE75-500',   cat: pest,  brand: 'Dhanuka',      unit: 'pcs',  pp: 12000,  sp: 16000,  mrp: 20000,  gst: 18, hsn: '38081099', msa: 5  },
    { name: 'Profenofos 50% EC 1 L',        name_hindi: 'प्रोफेनोफॉस 50% ईसी 1 लीटर',         sku: 'PEST-PROF50-1L',   cat: pest,  brand: 'Rallis',       unit: 'ltr',  pp: 35000,  sp: 45000,  mrp: 55000,  gst: 18, hsn: '38081099', msa: 5  },
    { name: 'Fipronil 5% SC 1 L',           name_hindi: 'फिप्रोनिल 5% एससी 1 लीटर',           sku: 'PEST-FIP5-1L',     cat: pest,  brand: 'BASF',         unit: 'ltr',  pp: 55000,  sp: 68000,  mrp: 80000,  gst: 18, hsn: '38081099', msa: 3  },
    { name: 'Emamectin Benzoate 5% SG 100 g', name_hindi: 'इमामेक्टिन बेंजोएट 5% 100 ग्राम', sku: 'PEST-EMAM5-100',  cat: pest,  brand: 'Syngenta',     unit: 'pcs',  pp: 32000,  sp: 42000,  mrp: 52000,  gst: 18, hsn: '38081099', msa: 5  },

    // ── FUNGICIDES  (GST 18%) ──────────────────────────────────────────────
    { name: 'Mancozeb 75% WP 1 Kg',         name_hindi: 'मैंकोजेब 75% डब्ल्यूपी 1 किग्रा',    sku: 'FUNG-MAN75-1KG',   cat: fung,  brand: 'Indofil',      unit: 'kg',   pp: 18000,  sp: 24000,  mrp: 28000,  gst: 18, hsn: '38082000', msa: 5  },
    { name: 'Carbendazim 50% WP 500 g',     name_hindi: 'कार्बेन्डाजिम 50% डब्ल्यूपी 500 ग्राम', sku: 'FUNG-CARB50-500', cat: fung,  brand: 'BASF',         unit: 'pcs',  pp: 9000,   sp: 12500,  mrp: 15000,  gst: 18, hsn: '38082000', msa: 5  },
    { name: 'Propiconazole 25% EC 250 ml',  name_hindi: 'प्रोपिकोनाजोल 25% ईसी 250 मिली',     sku: 'FUNG-PROP25-250',  cat: fung,  brand: 'Syngenta',     unit: 'pcs',  pp: 22000,  sp: 28000,  mrp: 33000,  gst: 18, hsn: '38082000', msa: 5  },
    { name: 'Copper Oxychloride 50% WP 500 g', name_hindi: 'कॉपर ऑक्सीक्लोराइड 50% 500 ग्राम', sku: 'FUNG-COP50-500', cat: fung,  brand: 'Rallis',       unit: 'pcs',  pp: 7000,   sp: 9500,   mrp: 12000,  gst: 18, hsn: '38082000', msa: 5  },
    { name: 'Tricyclazole 75% WP 500 g',    name_hindi: 'ट्राइसाइक्लाजोल 75% डब्ल्यूपी 500 ग्राम', sku: 'FUNG-TRI75-500', cat: fung, brand: 'BASF',        unit: 'pcs',  pp: 32000,  sp: 42000,  mrp: 50000,  gst: 18, hsn: '38082000', msa: 5  },
    { name: 'Hexaconazole 5% SC 250 ml',    name_hindi: 'हेक्साकोनाजोल 5% एससी 250 मिली',      sku: 'FUNG-HEX5-250',    cat: fung,  brand: 'Bayer',        unit: 'pcs',  pp: 12000,  sp: 16000,  mrp: 20000,  gst: 18, hsn: '38082000', msa: 5  },
    { name: 'Kasugamycin 3% SL 500 ml',     name_hindi: 'कसुगामाइसिन 3% एसएल 500 मिली',        sku: 'FUNG-KAS3-500',    cat: fung,  brand: 'Dhanuka',      unit: 'pcs',  pp: 28000,  sp: 36000,  mrp: 43000,  gst: 18, hsn: '38082000', msa: 3  },
    { name: 'Tebuconazole 25.9% EW 250 ml', name_hindi: 'टेब्यूकोनाजोल 25.9% 250 मिली',        sku: 'FUNG-TEB25-250',   cat: fung,  brand: 'Bayer',        unit: 'pcs',  pp: 24000,  sp: 32000,  mrp: 40000,  gst: 18, hsn: '38082000', msa: 3  },

    // ── HERBICIDES  (GST 18%) ──────────────────────────────────────────────
    { name: 'Glyphosate 41% SL 1 L',        name_hindi: 'ग्लाइफोसेट 41% एसएल 1 लीटर',         sku: 'HERB-GLY41-1L',    cat: herb,  brand: 'Bayer',        unit: 'ltr',  pp: 17000,  sp: 22000,  mrp: 27000,  gst: 18, hsn: '38083000', msa: 5  },
    { name: '2,4-D Amine 58% SL 500 ml',    name_hindi: '2,4-डी अमाइन 500 मिली',               sku: 'HERB-24D58-500',   cat: herb,  brand: 'Dhanuka',      unit: 'pcs',  pp: 6000,   sp: 8000,   mrp: 10000,  gst: 18, hsn: '38083000', msa: 5  },
    { name: 'Atrazine 50% WP 500 g',        name_hindi: 'एट्राजीन 50% डब्ल्यूपी 500 ग्राम',    sku: 'HERB-ATR50-500',   cat: herb,  brand: 'Syngenta',     unit: 'pcs',  pp: 7500,   sp: 10000,  mrp: 12500,  gst: 18, hsn: '38083000', msa: 5  },
    { name: 'Pendimethalin 30% EC 1 L',     name_hindi: 'पेंडीमेथालिन 30% ईसी 1 लीटर',         sku: 'HERB-PEND30-1L',   cat: herb,  brand: 'BASF',         unit: 'ltr',  pp: 14000,  sp: 18000,  mrp: 22000,  gst: 18, hsn: '38083000', msa: 5  },
    { name: 'Butachlor 50% EC 1 L',         name_hindi: 'ब्यूटाक्लोर 50% ईसी 1 लीटर',          sku: 'HERB-BUT50-1L',    cat: herb,  brand: 'Rallis',       unit: 'ltr',  pp: 11000,  sp: 14000,  mrp: 17000,  gst: 18, hsn: '38083000', msa: 5  },
    { name: 'Metribuzin 70% WP 250 g',      name_hindi: 'मेट्रीब्यूजिन 70% डब्ल्यूपी 250 ग्राम', sku: 'HERB-MET70-250',  cat: herb,  brand: 'Bayer',        unit: 'pcs',  pp: 20000,  sp: 26000,  mrp: 32000,  gst: 18, hsn: '38083000', msa: 3  },
    { name: 'Pretilachlor 37% EW 1 L',      name_hindi: 'प्रीटिलाक्लोर 37% ईडब्ल्यू 1 लीटर',  sku: 'HERB-PRE37-1L',    cat: herb,  brand: 'Syngenta',     unit: 'ltr',  pp: 38000,  sp: 48000,  mrp: 58000,  gst: 18, hsn: '38083000', msa: 3  },

    // ── SEEDS  (GST 0%) ───────────────────────────────────────────────────
    { name: 'Paddy Hybrid Seeds 5 Kg',      name_hindi: 'धान हाइब्रिड बीज 5 किग्रा',           sku: 'SEED-PADDY-5',     cat: seed,  brand: 'Pioneer',      unit: 'pkt',  pp: 45000,  sp: 55000,  mrp: 65000,  gst: 0,  hsn: '12091100', msa: 5  },
    { name: 'Wheat Seeds 30 Kg',            name_hindi: 'गेहूं बीज 30 किग्रा',                   sku: 'SEED-WHEAT-30',    cat: seed,  brand: 'NUZIVEEDU',    unit: 'bag',  pp: 90000,  sp: 110000, mrp: 125000, gst: 0,  hsn: '12099100', msa: 5  },
    { name: 'Cotton Bt Seeds 450 g',        name_hindi: 'कपास बीटी बीज 450 ग्राम',               sku: 'SEED-COTTON-450',  cat: seed,  brand: 'Mahyco',       unit: 'pkt',  pp: 73000,  sp: 83000,  mrp: 93000,  gst: 0,  hsn: '12092100', msa: 5  },
    { name: 'Soybean Seeds 30 Kg',          name_hindi: 'सोयाबीन बीज 30 किग्रा',                 sku: 'SEED-SOY-30',      cat: seed,  brand: 'MAUS',         unit: 'bag',  pp: 80000,  sp: 95000,  mrp: 110000, gst: 0,  hsn: '12099100', msa: 5  },
    { name: 'Maize Hybrid Seeds 5 Kg',      name_hindi: 'मक्का हाइब्रिड बीज 5 किग्रा',           sku: 'SEED-MAIZE-5',     cat: seed,  brand: 'Pioneer',      unit: 'pkt',  pp: 60000,  sp: 72000,  mrp: 85000,  gst: 0,  hsn: '12099100', msa: 5  },
    { name: 'Sunflower Hybrid Seeds 4 Kg',  name_hindi: 'सूरजमुखी हाइब्रिड बीज 4 किग्रा',       sku: 'SEED-SUN-4',       cat: seed,  brand: 'Syngenta',     unit: 'pkt',  pp: 55000,  sp: 65000,  mrp: 76000,  gst: 0,  hsn: '12099900', msa: 3  },
    { name: 'Groundnut Seeds 30 Kg',        name_hindi: 'मूंगफली बीज 30 किग्रा',                 sku: 'SEED-GND-30',      cat: seed,  brand: 'NRCG',         unit: 'bag',  pp: 75000,  sp: 90000,  mrp: 105000, gst: 0,  hsn: '12099100', msa: 5  },
    { name: 'Onion Seeds 500 g',            name_hindi: 'प्याज बीज 500 ग्राम',                   sku: 'SEED-ONION-500',   cat: seed,  brand: 'East West',    unit: 'pkt',  pp: 25000,  sp: 32000,  mrp: 40000,  gst: 0,  hsn: '12099900', msa: 5  },
    { name: 'Tomato F1 Hybrid 10 g',        name_hindi: 'टमाटर एफ1 हाइब्रिड 10 ग्राम',          sku: 'SEED-TOM-10',      cat: seed,  brand: 'Syngenta',     unit: 'pkt',  pp: 40000,  sp: 50000,  mrp: 62000,  gst: 0,  hsn: '12099900', msa: 5  },

    // ── BIO PRODUCTS  (GST 5%) ────────────────────────────────────────────
    { name: 'Trichoderma viride 1 Kg',      name_hindi: 'ट्राइकोडर्मा विराइड 1 किग्रा',         sku: 'BIO-TRICH-1KG',    cat: bio,   brand: 'IFFCO',        unit: 'kg',   pp: 8000,   sp: 12000,  mrp: 15000,  gst: 5,  hsn: '38089990', msa: 5  },
    { name: 'Rhizobium 1 Kg',               name_hindi: 'राइजोबियम 1 किग्रा',                    sku: 'BIO-RHIZ-1KG',     cat: bio,   brand: 'IFFCO',        unit: 'kg',   pp: 6000,   sp: 9000,   mrp: 12000,  gst: 5,  hsn: '38089990', msa: 5  },
    { name: 'PSB Biofertilizer 1 Kg',       name_hindi: 'पीएसबी जैव उर्वरक 1 किग्रा',            sku: 'BIO-PSB-1KG',      cat: bio,   brand: 'IFFCO',        unit: 'kg',   pp: 6000,   sp: 9000,   mrp: 12000,  gst: 5,  hsn: '38089990', msa: 5  },
    { name: 'Azotobacter 1 Kg',             name_hindi: 'एजोटोबैक्टर 1 किग्रा',                  sku: 'BIO-AZO-1KG',      cat: bio,   brand: 'IFFCO',        unit: 'kg',   pp: 6000,   sp: 9000,   mrp: 12000,  gst: 5,  hsn: '38089990', msa: 5  },
    { name: 'Neem Oil 1 L',                 name_hindi: 'नीम का तेल 1 लीटर',                     sku: 'BIO-NEEM-1L',      cat: bio,   brand: 'Bonide',       unit: 'ltr',  pp: 12000,  sp: 18000,  mrp: 22000,  gst: 5,  hsn: '38089990', msa: 5  },
    { name: 'Neem Cake 5 Kg',               name_hindi: 'नीम की खली 5 किग्रा',                   sku: 'BIO-NCAKE-5KG',    cat: bio,   brand: 'Local',        unit: 'bag',  pp: 10000,  sp: 15000,  mrp: 20000,  gst: 5,  hsn: '23099090', msa: 10 },
    { name: 'Vermicompost 5 Kg',            name_hindi: 'वर्मीकम्पोस्ट 5 किग्रा',                sku: 'BIO-VERM-5KG',     cat: bio,   brand: 'Local',        unit: 'bag',  pp: 5000,   sp: 8000,   mrp: 10000,  gst: 5,  hsn: '31010000', msa: 10 },

    // ── MICRO NUTRIENTS  (GST 12%) ────────────────────────────────────────
    { name: 'Zinc Sulphate 21% 500 g',      name_hindi: 'जिंक सल्फेट 21% 500 ग्राम',             sku: 'MICRO-ZN-500',     cat: micro, brand: 'IFFCO',        unit: 'pcs',  pp: 3500,   sp: 5000,   mrp: 6500,   gst: 12, hsn: '28332990', msa: 10 },
    { name: 'Ferrous Sulphate 1 Kg',        name_hindi: 'फेरस सल्फेट 1 किग्रा',                  sku: 'MICRO-FE-1KG',     cat: micro, brand: 'IFFCO',        unit: 'kg',   pp: 4000,   sp: 6000,   mrp: 7500,   gst: 12, hsn: '28332990', msa: 10 },
    { name: 'Borax 500 g',                  name_hindi: 'बोरेक्स 500 ग्राम',                     sku: 'MICRO-BOR-500',    cat: micro, brand: 'Dharamsi',     unit: 'pcs',  pp: 3500,   sp: 5000,   mrp: 6000,   gst: 12, hsn: '28401100', msa: 10 },
    { name: 'Magnesium Sulphate 1 Kg',      name_hindi: 'मैग्नीशियम सल्फेट 1 किग्रा',            sku: 'MICRO-MG-1KG',     cat: micro, brand: 'Dharamsi',     unit: 'kg',   pp: 3000,   sp: 4500,   mrp: 6000,   gst: 12, hsn: '28332990', msa: 10 },
    { name: 'Calcium Nitrate 1 Kg',         name_hindi: 'कैल्शियम नाइट्रेट 1 किग्रा',             sku: 'MICRO-CA-1KG',     cat: micro, brand: 'SQM',          unit: 'kg',   pp: 6000,   sp: 8500,   mrp: 11000,  gst: 12, hsn: '28342990', msa: 10 },
    { name: 'Chelated Micronutrient Mix 500 g', name_hindi: 'चीलेटेड माइक्रोन्यूट्रिएंट मिक्स 500 ग्राम', sku: 'MICRO-MIX-500', cat: micro, brand: 'Aries Agro', unit: 'pcs', pp: 14000, sp: 19000, mrp: 23000, gst: 12, hsn: '38249999', msa: 5 },
    { name: 'Manganese Sulphate 500 g',     name_hindi: 'मैंगनीज सल्फेट 500 ग्राम',               sku: 'MICRO-MN-500',     cat: micro, brand: 'Dharamsi',     unit: 'pcs',  pp: 3500,   sp: 5000,   mrp: 6500,   gst: 12, hsn: '28332990', msa: 10 },

    // ── PLANT GROWTH REGULATORS  (GST 18%) ───────────────────────────────
    { name: 'GA3 Gibberellic Acid 500 ml',  name_hindi: 'जीए3 जिबरेलिक एसिड 500 मिली',          sku: 'PGR-GA3-500',      cat: pgr,   brand: 'Bayer',        unit: 'pcs',  pp: 18000,  sp: 25000,  mrp: 32000,  gst: 18, hsn: '29322990', msa: 3  },
    { name: 'Ethephon 39% SL 500 ml',       name_hindi: 'इथेफॉन 39% एसएल 500 मिली',              sku: 'PGR-ETH39-500',    cat: pgr,   brand: 'BASF',         unit: 'pcs',  pp: 12000,  sp: 16000,  mrp: 20000,  gst: 18, hsn: '29310099', msa: 3  },
    { name: 'Paclobutrazol 23% SC 250 ml',  name_hindi: 'पैक्लोब्यूट्राजोल 23% 250 मिली',        sku: 'PGR-PAC23-250',    cat: pgr,   brand: 'Syngenta',     unit: 'pcs',  pp: 28000,  sp: 38000,  mrp: 48000,  gst: 18, hsn: '29339990', msa: 3  },
    { name: 'Triacontanol 0.1% EC 1 L',     name_hindi: 'ट्रायकोंटेनॉल 0.1% 1 लीटर',             sku: 'PGR-TRIA-1L',      cat: pgr,   brand: 'SWAL',         unit: 'ltr',  pp: 8000,   sp: 12000,  mrp: 16000,  gst: 18, hsn: '38089999', msa: 3  },

    // ── IRRIGATION  (GST 12%) ─────────────────────────────────────────────
    { name: 'Drip Irrigation Kit 1 Acre',   name_hindi: 'ड्रिप सिंचाई किट 1 एकड़',               sku: 'IRRIG-DRIP-1AC',   cat: irr,   brand: 'Netafim',      unit: 'set',  pp: 800000, sp: 950000, mrp: 1100000, gst: 12, hsn: '84248100', msa: 1  },
    { name: 'Sprinkler Set 1 Acre',          name_hindi: 'स्प्रिंकलर सेट 1 एकड़',                 sku: 'IRRIG-SPRNK-1AC',  cat: irr,   brand: 'Jain',         unit: 'set',  pp: 500000, sp: 600000, mrp: 700000, gst: 12, hsn: '84248100', msa: 1  },
    { name: 'PVC Pipe 4 inch 6 m',          name_hindi: 'पीवीसी पाइप 4 इंच 6 मीटर',              sku: 'IRRIG-PIPE-4IN',   cat: irr,   brand: 'Finolex',      unit: 'pcs',  pp: 35000,  sp: 45000,  mrp: 55000,  gst: 12, hsn: '39172200', msa: 5  },
    { name: 'Water Pump 1 HP',              name_hindi: 'वाटर पंप 1 एचपी',                       sku: 'IRRIG-PUMP-1HP',   cat: irr,   brand: 'Kirloskar',    unit: 'pcs',  pp: 250000, sp: 320000, mrp: 380000, gst: 12, hsn: '84132000', msa: 1  },

    // ── TOOLS & EQUIPMENT  (GST 18%) ─────────────────────────────────────
    { name: 'Hand Sprayer 16 L',            name_hindi: 'हैंड स्प्रेयर 16 लीटर',                 sku: 'TOOL-HSPRAY-16',   cat: tool,  brand: 'Neptune',      unit: 'pcs',  pp: 90000,  sp: 115000, mrp: 140000, gst: 18, hsn: '84248990', msa: 3  },
    { name: 'Battery Sprayer 16 L',         name_hindi: 'बैटरी स्प्रेयर 16 लीटर',                sku: 'TOOL-BSPRAY-16',   cat: tool,  brand: 'Aspee',        unit: 'pcs',  pp: 200000, sp: 250000, mrp: 300000, gst: 18, hsn: '84248990', msa: 2  },
    { name: 'Power Sprayer 20 L',           name_hindi: 'पावर स्प्रेयर 20 लीटर',                 sku: 'TOOL-PSPRAY-20',   cat: tool,  brand: 'Aspee',        unit: 'pcs',  pp: 350000, sp: 430000, mrp: 500000, gst: 18, hsn: '84248990', msa: 1  },
    { name: 'Soil Testing Kit',             name_hindi: 'मिट्टी परीक्षण किट',                    sku: 'TOOL-STKIT',       cat: tool,  brand: 'ICAR',         unit: 'pcs',  pp: 80000,  sp: 110000, mrp: 135000, gst: 18, hsn: '90278090', msa: 2  },
    { name: 'Sickle / Grass Cutter',        name_hindi: 'दरांती',                                sku: 'TOOL-SICKLE',      cat: tool,  brand: 'Local',        unit: 'pcs',  pp: 5000,   sp: 8000,   mrp: 10000,  gst: 18, hsn: '82011000', msa: 5  },
    { name: 'Measuring Cylinder 1 L',       name_hindi: 'मापने का सिलेंडर 1 लीटर',               sku: 'TOOL-MCYL-1L',     cat: tool,  brand: 'Local',        unit: 'pcs',  pp: 3000,   sp: 5000,   mrp: 7000,   gst: 18, hsn: '90179000', msa: 5  },
  ]);
}

// ── Master list ───────────────────────────────────────────────────────────────
function applySeedMigrations() {
  console.log('🌱 Applying seed migrations...');
  runSeed('seed_v1_categories', seedV1Categories);
  runSeed('seed_v2_products',   seedV2Products);
  console.log('✅ Seeds up to date.');
}

module.exports = { applySeedMigrations };
