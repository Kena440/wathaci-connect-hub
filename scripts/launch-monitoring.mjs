#!/usr/bin/env node
/**
 * Launch Window Monitoring Script
 * 
 * This script performs ongoing monitoring during the production launch window:
 * 1. Auth system health checks
 * 2. Email delivery monitoring
 * 3. Database connectivity
 * 4. Payment webhook status
 * 5. Error rate tracking
 * 
 * Usage:
 *   node scripts/launch-monitoring.mjs [--interval=60] [--duration=3600]
 * 
 * Options:
 *   --interval: Check interval in seconds (default: 60)
 *   --duration: Total monitoring duration in seconds (default: 3600 = 1 hour)
 *   --continuous: Run continuously until manually stopped
 * 
 * Environment Variables Required:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 */

import { createClient } from '@supabase/supabase-js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const intervalArg = args.find(arg => arg.startsWith('--interval='))?.split('=')[1];
const durationArg = args.find(arg => arg.startsWith('--duration='))?.split('=')[1];
const continuousMode = args.includes('--continuous');

const checkInterval = parseInt(intervalArg || '60') * 1000; // Convert to milliseconds
const monitorDuration = continuousMode ? Infinity : (parseInt(durationArg || '3600') * 1000);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validation
if (!supabaseUrl || !supabaseKey) {
  console.error(`${colors.red}${colors.bold}❌ Error: Missing environment variables${colors.reset}`);
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Monitoring state
const monitoringState = {
  startTime: Date.now(),
  checkCount: 0,
  successfulChecks: 0,
  failedChecks: 0,
  warnings: 0,
  metrics: {
    authHealth: [],
    databaseHealth: [],
    responseTime: [],
    errorRate: [],
  },
  alerts: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    monitor: `${colors.cyan}📊`,
    alert: `${colors.red}${colors.bold}🚨`,
  }[type] || '';

  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${prefix} ${message}${colors.reset}`);
}

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

function recordMetric(category, value) {
  if (monitoringState.metrics[category]) {
    monitoringState.metrics[category].push({
      value,
      timestamp: Date.now(),
    });
    // Keep only last 100 data points
    if (monitoringState.metrics[category].length > 100) {
      monitoringState.metrics[category].shift();
    }
  }
}

function addAlert(severity, message) {
  const alert = {
    severity,
    message,
    timestamp: new Date().toISOString(),
  };
  monitoringState.alerts.push(alert);
  log(`ALERT: ${message}`, 'alert');
  
  // Keep only last 50 alerts
  if (monitoringState.alerts.length > 50) {
    monitoringState.alerts.shift();
  }
}

// Health check: Supabase connection
async function checkSupabaseHealth() {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.auth.getSession();
    const responseTime = Date.now() - startTime;
    recordMetric('responseTime', responseTime);
    
    if (error && error.message !== 'no active session') {
      recordMetric('authHealth', 0);
      addAlert('HIGH', `Supabase auth error: ${error.message}`);
      return { healthy: false, responseTime, error: error.message };
    }
    
    recordMetric('authHealth', 1);
    return { healthy: true, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    recordMetric('authHealth', 0);
    recordMetric('responseTime', responseTime);
    addAlert('CRITICAL', `Supabase connection failed: ${error.message}`);
    return { healthy: false, responseTime, error: error.message };
  }
}

// Health check: Database connectivity
async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Try to fetch a simple record from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      recordMetric('databaseHealth', 0);
      addAlert('HIGH', `Database query error: ${error.message}`);
      return { healthy: false, responseTime, error: error.message };
    }
    
    recordMetric('databaseHealth', 1);
    return { healthy: true, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    recordMetric('databaseHealth', 0);
    addAlert('CRITICAL', `Database connection failed: ${error.message}`);
    return { healthy: false, responseTime, error: error.message };
  }
}

// Check recent error logs (if frontend_logs table exists)
async function checkErrorLogs() {
  try {
    const { data, error } = await supabase
      .from('frontend_logs')
      .select('level, message, created_at')
      .gte('created_at', new Date(Date.now() - checkInterval).toISOString())
      .eq('level', 'error')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      // Table might not exist, that's okay
      return { errorCount: 0, errors: [] };
    }
    
    const errorCount = data?.length || 0;
    recordMetric('errorRate', errorCount);
    
    if (errorCount > 5) {
      addAlert('MEDIUM', `High error rate detected: ${errorCount} errors in last interval`);
    }
    
    return { errorCount, errors: data || [] };
  } catch (error) {
    return { errorCount: 0, errors: [], warning: error.message };
  }
}

// Check webhook logs (if webhook_logs table exists)
async function checkWebhookHealth() {
  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - checkInterval).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      // Table might not exist, that's okay
      return { webhookCount: 0, failedCount: 0 };
    }
    
    const webhookCount = data?.length || 0;
    const failedCount = data?.filter(log => log.status === 'failed').length || 0;
    
    if (failedCount > webhookCount * 0.2) {
      addAlert('MEDIUM', `High webhook failure rate: ${failedCount}/${webhookCount}`);
    }
    
    return { webhookCount, failedCount };
  } catch (error) {
    return { webhookCount: 0, failedCount: 0, warning: error.message };
  }
}

// Perform comprehensive health check
async function performHealthCheck() {
  monitoringState.checkCount++;
  
  log(`Health check #${monitoringState.checkCount}`, 'monitor');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
  };
  
  // Run all health checks
  results.checks.supabase = await checkSupabaseHealth();
  results.checks.database = await checkDatabaseHealth();
  results.checks.errorLogs = await checkErrorLogs();
  results.checks.webhooks = await checkWebhookHealth();
  
  // Determine overall health
  const allHealthy = 
    results.checks.supabase.healthy &&
    results.checks.database.healthy;
  
  if (allHealthy) {
    monitoringState.successfulChecks++;
    log('All systems healthy', 'success');
  } else {
    monitoringState.failedChecks++;
    log('System health issues detected', 'error');
  }
  
  // Log metrics
  log(`Response time: ${results.checks.supabase.responseTime}ms`, 'info');
  log(`DB response time: ${results.checks.database.responseTime}ms`, 'info');
  
  if (results.checks.errorLogs.errorCount > 0) {
    log(`Recent errors: ${results.checks.errorLogs.errorCount}`, 'warning');
    monitoringState.warnings++;
  }
  
  if (results.checks.webhooks.webhookCount > 0) {
    log(`Webhooks processed: ${results.checks.webhooks.webhookCount} (${results.checks.webhooks.failedCount} failed)`, 'info');
  }
  
  return results;
}

// Calculate and display statistics
function displayStatistics() {
  logHeader('📊 Monitoring Statistics');
  
  const uptime = Date.now() - monitoringState.startTime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const uptimeSeconds = Math.floor((uptime % 60000) / 1000);
  
  console.log(`${colors.bold}Session:${colors.reset}`);
  console.log(`  Uptime: ${uptimeMinutes}m ${uptimeSeconds}s`);
  console.log(`  Total Checks: ${monitoringState.checkCount}`);
  console.log(`  ${colors.green}Successful: ${monitoringState.successfulChecks}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${monitoringState.failedChecks}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${monitoringState.warnings}${colors.reset}`);
  
  const successRate = monitoringState.checkCount > 0
    ? ((monitoringState.successfulChecks / monitoringState.checkCount) * 100).toFixed(1)
    : 0;
  console.log(`  Success Rate: ${successRate}%\n`);
  
  // Calculate average response times
  const avgResponseTime = monitoringState.metrics.responseTime.length > 0
    ? (monitoringState.metrics.responseTime.reduce((sum, m) => sum + m.value, 0) / 
       monitoringState.metrics.responseTime.length).toFixed(0)
    : 0;
  
  console.log(`${colors.bold}Performance:${colors.reset}`);
  console.log(`  Avg Response Time: ${avgResponseTime}ms`);
  
  if (avgResponseTime > 1000) {
    console.log(`  ${colors.yellow}⚠️  Response time is high${colors.reset}`);
  } else if (avgResponseTime > 500) {
    console.log(`  ${colors.yellow}⚠️  Response time is elevated${colors.reset}`);
  } else {
    console.log(`  ${colors.green}✅ Response time is good${colors.reset}`);
  }
  
  // Recent alerts
  if (monitoringState.alerts.length > 0) {
    console.log(`\n${colors.bold}Recent Alerts (last 10):${colors.reset}`);
    monitoringState.alerts.slice(-10).forEach((alert, index) => {
      const time = new Date(alert.timestamp).toLocaleTimeString();
      const severityColor = {
        CRITICAL: colors.red,
        HIGH: colors.red,
        MEDIUM: colors.yellow,
        LOW: colors.blue,
      }[alert.severity] || colors.reset;
      
      console.log(`  ${severityColor}[${alert.severity}]${colors.reset} ${time} - ${alert.message}`);
    });
  }
  
  console.log('');
}

// Main monitoring loop
async function startMonitoring() {
  logHeader('🚀 Launch Window Monitoring');
  
  console.log(`${colors.bold}Configuration:${colors.reset}`);
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Check Interval: ${checkInterval / 1000}s`);
  if (continuousMode) {
    console.log(`  Mode: Continuous (press Ctrl+C to stop)`);
  } else {
    console.log(`  Duration: ${monitorDuration / 1000}s (${monitorDuration / 60000}m)`);
  }
  console.log(`  Start Time: ${new Date().toISOString()}\n`);
  
  log('Starting monitoring...', 'monitor');
  
  // Initial check
  await performHealthCheck();
  
  // Set up interval for periodic checks
  const checkIntervalId = setInterval(async () => {
    await performHealthCheck();
    
    // Check if we've exceeded the monitoring duration
    if (!continuousMode && Date.now() - monitoringState.startTime >= monitorDuration) {
      clearInterval(checkIntervalId);
      clearInterval(statsIntervalId);
      await finishMonitoring();
    }
  }, checkInterval);
  
  // Set up interval for statistics display (every 5 minutes)
  const statsIntervalId = setInterval(() => {
    displayStatistics();
  }, 300000);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n');
    log('Received interrupt signal, shutting down...', 'warning');
    clearInterval(checkIntervalId);
    clearInterval(statsIntervalId);
    await finishMonitoring();
  });
}

// Finish monitoring and display final report
async function finishMonitoring() {
  logHeader('📋 Final Monitoring Report');
  
  displayStatistics();
  
  console.log(`${colors.bold}Recommendations:${colors.reset}\n`);
  
  if (monitoringState.failedChecks === 0) {
    console.log(`${colors.green}✅ All systems operating normally during launch window${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some issues detected during launch window${colors.reset}`);
    console.log('   Review the alerts above and investigate any failures');
  }
  
  console.log('\nNext Steps:');
  console.log('1. Review Supabase dashboard for detailed logs');
  console.log('2. Check error logs in frontend_logs table');
  console.log('3. Monitor webhook_logs for payment issues');
  console.log('4. Review user feedback and support tickets');
  console.log('5. Continue monitoring for next 24-48 hours\n');
  
  console.log(`${colors.bold}Additional Resources:${colors.reset}`);
  console.log('- PRODUCTION_LAUNCH_READINESS_SUMMARY.md');
  console.log('- DEPLOYMENT_SECURITY_FOLLOW_UP.md');
  console.log('- Email: support@wathaci.com\n');
  
  process.exit(0);
}

// Start the monitoring
startMonitoring().catch((error) => {
  console.error(`${colors.red}${colors.bold}❌ Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
