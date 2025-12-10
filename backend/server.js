/**
 * Local development server for Wathaci Connect Backend
 * 
 * This file is used ONLY for local development (npm start or nodemon).
 * In production on Vercel, the app is exported from index.js and used
 * as a serverless function via api/index.js.
 * 
 * Usage:
 *   npm start          - Start the server with Node
 *   npm run dev        - Start with nodemon for auto-reload
 */

// Load environment variables for local development
require('dotenv').config();

const app = require('./index');
const { startSlaMonitor } = require('./services/support-ticket-service');
const { startInboxMonitor } = require('./services/inbox-monitor');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Wathaci backend (local) running at http://localhost:${PORT}`);
  console.log('Health check: http://localhost:' + PORT + '/health');
});

// Start background services for local development
startSlaMonitor();
startInboxMonitor().catch(error => {
  console.warn('[InboxMonitor] Failed to start', error.message);
});
