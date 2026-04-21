const crypto = require('crypto');

const GRACE_DAYS = 7;

function createGraceToken(payload, secret) {
  const expiresAt = Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000;
  const data = JSON.stringify({ ...payload, expiresAt });
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64');
}

function verifyGraceToken(token, secret) {
  try {
    const { data, sig } = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
    const parsed = JSON.parse(data);
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

module.exports = { createGraceToken, verifyGraceToken };
