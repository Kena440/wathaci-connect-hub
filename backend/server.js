require('dotenv').config();

const app = require('./index');
const { startInboxMonitor } = require('./services/inbox-monitor');
const { startSlaMonitor } = require('./services/support-ticket-service');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Wathaci backend (local) running at http://localhost:${PORT}`);
  startSlaMonitor();
  startInboxMonitor().catch(error => {
    console.warn('[InboxMonitor] Failed to start', error.message);
  });
});
