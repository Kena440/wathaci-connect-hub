/**
 * Vercel Serverless Function Entrypoint
 * 
 * This file serves as the entry point for the Vercel serverless deployment.
 * It imports the Express app from ../index.js and exports it for Vercel to use.
 * 
 * Vercel will automatically handle incoming HTTP requests and route them through
 * this Express app instance.
 * 
 * Note: app.listen() is NOT called here - Vercel handles the server lifecycle.
 */

const app = require('../index');

// Vercel will use this exported app as the request handler
module.exports = app;
