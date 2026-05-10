const rateLimit = require('express-rate-limit');
const path = require('path');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts, please try again later.', code: 'AUTH_RATE_LIMITED' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts, please try again later.', code: 'LOGIN_RATE_LIMITED' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests, please try again later.', code: 'RESET_RATE_LIMITED' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many API requests, please try again later.', code: 'API_RATE_LIMITED' }
});

module.exports = {
  generalLimiter,
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
  apiLimiter
};
