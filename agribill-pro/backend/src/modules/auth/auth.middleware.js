const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { UnauthorizedError, ForbiddenError } = require('../../utils/errors');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // EventSource (SSE) can't set headers, so allow token via query param as fallback
  const rawToken = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : req.query.token || null;

  if (!rawToken) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = rawToken;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (e) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role !== 'owner') {
    return next(new ForbiddenError('Owner access required'));
  }
  next();
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    // silently ignore invalid token for optional auth
  }
  next();
};

module.exports = { verifyToken, requireOwner, optionalAuth };
