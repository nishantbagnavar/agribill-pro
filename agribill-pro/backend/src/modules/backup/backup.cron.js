const cron = require('node-cron');
const { createSnapshot, createLocalBackup } = require('./backup.service');

function startBackupCron() {
  // Startup backup — always do a local backup when server starts
  setTimeout(async () => {
    try {
      await createLocalBackup('startup');
    } catch (e) {
      console.warn('⚠️  Startup backup skipped:', e.message);
    }
  }, 10000); // 10s after start so DB is fully ready

  // Daily at 2:00 AM — local + cloud (if configured)
  cron.schedule('0 2 * * *', async () => {
    try {
      await createSnapshot('daily');
      console.log('✅ Daily backup completed');
    } catch (e) {
      console.error('❌ Daily backup failed:', e.message);
    }
  });

  console.log('✅ Backup cron started (startup + daily 2AM)');
}

module.exports = { startBackupCron };
