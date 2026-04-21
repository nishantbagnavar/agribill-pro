const cron = require('node-cron');
const { checkLowStock, checkExpiry, sendDueReminders } = require('./reminder.service');

function startCronJobs() {
  // Daily at 9:00 AM — low stock + expiry checks
  cron.schedule('0 9 * * *', async () => {
    try {
      const lowStock = checkLowStock();
      console.log(`🔔 Cron: Low stock checked — ${lowStock.length} alerts`);
      const expiring = checkExpiry();
      console.log(`🔔 Cron: Expiry checked — ${expiring.length} alerts`);
    } catch (e) {
      console.error('❌ Cron low-stock/expiry error:', e.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Every Monday at 10:00 AM — due payment reminders
  cron.schedule('0 10 * * 1', async () => {
    try {
      const customers = sendDueReminders();
      console.log(`🔔 Cron: Due reminders sent — ${customers.length} customers`);
    } catch (e) {
      console.error('❌ Cron due-reminders error:', e.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Cron jobs started (daily 9AM + Monday 10AM IST)');
}

module.exports = { startCronJobs };
