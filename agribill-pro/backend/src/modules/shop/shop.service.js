const { sqlite } = require('../../config/db');
const { NotFoundError } = require('../../utils/errors');

const getProfile = () => {
  const profile = sqlite.prepare('SELECT * FROM shop_profile LIMIT 1').get();
  if (!profile) throw new NotFoundError('Shop profile');
  return profile;
};

const updateProfile = (data) => {
  const current = sqlite.prepare('SELECT id FROM shop_profile LIMIT 1').get();

  if (!current) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const cols = fields.join(', ');
    sqlite.prepare(`INSERT INTO shop_profile (${cols}) VALUES (${placeholders})`).run(...Object.values(data));
  } else {
    const fields = Object.keys(data);
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    sqlite.prepare(`UPDATE shop_profile SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(data), current.id);
  }

  return sqlite.prepare('SELECT * FROM shop_profile LIMIT 1').get();
};

const uploadLogo = (filePath) => {
  const current = sqlite.prepare('SELECT id FROM shop_profile LIMIT 1').get();
  if (!current) throw new NotFoundError('Shop profile');
  sqlite.prepare(`UPDATE shop_profile SET logo_path = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(filePath, current.id);
  return { logo_path: filePath };
};

module.exports = { getProfile, updateProfile, uploadLogo };
