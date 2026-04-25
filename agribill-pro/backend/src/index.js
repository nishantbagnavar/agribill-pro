// Sentry must be initialized before any other imports
const Sentry = require('@sentry/node');

let profilingIntegration;
try {
  profilingIntegration = require('@sentry/profiling-node').nodeProfilingIntegration;
} catch {
  profilingIntegration = null;
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: profilingIntegration ? [profilingIntegration()] : [],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'development',
    enabled: process.env.NODE_ENV === 'production',
  });
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Increased for dev testing
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/update-manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../../update-manifest.json'));
});

// Routes — imported lazily so DB is ready
app.use('/api/auth',    require('./modules/auth/auth.routes'));
app.use('/api/license', require('./modules/license/license.routes'));

// All routes below require a valid license in production
const { licenseGate } = require('./modules/license/license.gate');
app.use('/api/shop',       licenseGate, require('./modules/shop/shop.routes'));
app.use('/api/categories', licenseGate, require('./modules/categories/categories.routes'));
app.use('/api/products',   licenseGate, require('./modules/products/products.routes'));
app.use('/api/inventory',  licenseGate, require('./modules/inventory/inventory.routes'));
app.use('/api/customers',  licenseGate, require('./modules/customers/customers.routes'));
app.use('/api/billing',    licenseGate, require('./modules/billing/billing.routes'));
app.use('/api/dashboard',  licenseGate, require('./modules/dashboard/dashboard.routes'));
app.use('/api/reminders',  licenseGate, require('./modules/reminders/reminders.routes'));
app.use('/api/whatsapp',   licenseGate, require('./modules/whatsapp/whatsapp.routes'));
app.use('/api/reports',    licenseGate, require('./modules/reports/reports.routes'));
app.use('/api/printer',    licenseGate, require('./modules/printer/printer.routes'));
app.use('/api/backup',     licenseGate, require('./modules/backup/backup.routes'));
app.use('/api/updater',    licenseGate, require('./modules/updater/updater.routes'));

// Serve React build — always, so port 5000 works in all modes
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Sentry error handler (must be before custom error handler)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler());
}

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (env.NODE_ENV !== 'production') console.error(err);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
});

// Start cron jobs (non-blocking)
try {
  require('./modules/reminders/reminder.cron').startCronJobs();
} catch (e) {
  console.warn('⚠️  Cron jobs not loaded:', e.message);
}

try {
  require('./modules/backup/backup.cron').startBackupCron();
} catch (e) {
  console.warn('⚠️  Backup cron not loaded:', e.message);
}

// Start WhatsApp
try {
  require('./modules/whatsapp/whatsapp.service').init();
} catch (e) {
  console.warn('⚠️  WhatsApp not loaded:', e.message);
}

// License background verification (startup + every 24h)
try {
  require('./modules/license/license.service').startLicenseVerificationCron();
} catch (e) {
  console.warn('⚠️  License cron not loaded:', e.message);
}

app.listen(env.PORT, () => {
  console.log(`🚀 AgriBill Pro server running on port ${env.PORT}`);
});

module.exports = app;
