const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sqlite } = require('../../config/db');
const env = require('../../config/env');
const { ValidationError, NotFoundError, UnauthorizedError } = require('../../utils/errors');
const { sendTelegramAlert } = require('../../utils/telegram');

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
  const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const register = async (data) => {
  const { name, email, phone, password, shop_name, owner_name } = data;

  const existing = sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new ValidationError({ email: ['Email already in use'] });

  const password_hash = await bcrypt.hash(password, 12);

  const insertUser = sqlite.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'owner')
  `);

  const result = sqlite.transaction(() => {
    const userResult = insertUser.run(name, email, password_hash);
    const userId = userResult.lastInsertRowid;

    // Create shop profile if shop details provided
    if (shop_name) {
      sqlite.prepare(`
        INSERT INTO shop_profile (shop_name, owner_name, phone)
        VALUES (?, ?, ?)
      `).run(shop_name, owner_name || name, phone || null);
    }

    return userId;
  })();

  const user = sqlite.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(result);
  const { accessToken, refreshToken } = generateTokens(user);

  sendTelegramAlert(
    `🌱 <b>New Shop Registered!</b>\n👤 ${name}\n📧 ${email}\n🏪 ${shop_name || 'N/A'}\n📞 ${phone || 'N/A'}`
  );

  return { user, accessToken, refreshToken };
};

const login = async (email, password) => {
  const user = sqlite.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const { accessToken, refreshToken } = generateTokens(user);

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

const refreshAccessToken = (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = sqlite.prepare('SELECT id, email, role FROM users WHERE id = ? AND is_active = 1').get(payload.id);
    if (!user) throw new UnauthorizedError('User not found');

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    return { accessToken };
  } catch (e) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

const getMe = (userId) => {
  const user = sqlite.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           sp.id as shop_id, sp.shop_name, sp.owner_name, sp.address,
           sp.city, sp.state, sp.phone, sp.gstin, sp.logo_path, sp.upi_id,
           sp.invoice_prefix, sp.invoice_counter
    FROM users u
    LEFT JOIN shop_profile sp ON 1=1
    WHERE u.id = ?
  `).get(userId);

  if (!user) throw new NotFoundError('User');
  return user;
};

module.exports = { register, login, refreshAccessToken, getMe };
