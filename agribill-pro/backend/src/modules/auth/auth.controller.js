const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/response');

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, user, 'Registration successful', 201);
  } catch (e) {
    next(e);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    sendSuccess(res, { user, accessToken, refreshToken }, 'Login successful');
  } catch (e) {
    next(e);
  }
};

const logout = (req, res) => {
  res.clearCookie('refreshToken');
  sendSuccess(res, null, 'Logged out');
};

const refreshToken = (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return sendError(res, 'Refresh token missing', 401);
    const result = authService.refreshAccessToken(token);
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    sendSuccess(res, user);
  } catch (e) {
    next(e);
  }
};

module.exports = { register, login, logout, refreshToken, getMe };
