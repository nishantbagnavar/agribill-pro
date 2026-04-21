const cron = require('node-cron');
const { createSnapshot, getStatus } = require('./backup.service');

function startBackupCron() {
  // daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    const status = getStatus();
    if (!status.configured || !status.auto_backup) return;
    try {
      await createSnapshot('auto');
      console.log('✅ Daily backup completed');
    } catch (e) {
      console.error('❌ Daily backup failed:', e.message);
    }
  });
}

module.exports = { startBackupCron };
