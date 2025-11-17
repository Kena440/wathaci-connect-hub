#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * 
 * Validates that all required environment variables are properly configured
 * for production deployment of WATHACI CONNECT platform.
 * 
 * This script checks:
 * - Database configuration (Supabase)
 * - Email configuration (SMTP)
 * - SMS/WhatsApp configuration (Twilio)
 * - Payment configuration (Lenco)
 * - Authentication settings
 * 
 * Run before deployment to ensure all systems are ready.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  });

  return env;
}

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  checkRequired(name, value, description) {
    if (!value || value === '' || value.includes('your-') || value.includes('placeholder')) {
      this.errors.push(`❌ ${name}: ${description} (REQUIRED)`);
      return false;
    }
    this.info.push(`✅ ${name}: Configured`);
    return true;
  }

  checkOptional(name, value, description) {
    if (!value || value === '' || value.includes('your-') || value.includes('placeholder')) {
      this.warnings.push(`⚠️  ${name}: ${description} (OPTIONAL - some features may not work)`);
      return false;
    }
    this.info.push(`✅ ${name}: Configured`);
    return true;
  }

  checkFormat(name, value, pattern, description) {
    if (!pattern.test(value)) {
      this.errors.push(`❌ ${name}: Invalid format - ${description}`);
      return false;
    }
    return true;
  }

  validateDatabase(env) {
    log('\n📊 Database Configuration (Supabase)', colors.bold);
    
    const hasUrl = this.checkRequired(
      'SUPABASE_URL',
      env.SUPABASE_URL || env.VITE_SUPABASE_URL,
      'Supabase project URL is required'
    );

    const hasServiceKey = this.checkRequired(
      'SUPABASE_SERVICE_ROLE_KEY',
      env.SUPABASE_SERVICE_ROLE_KEY,
      'Supabase service role key is required for backend operations'
    );

    const hasAnonKey = this.checkRequired(
      'VITE_SUPABASE_ANON_KEY',
      env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_KEY,
      'Supabase anon key is required for frontend'
    );

    if (hasUrl && env.SUPABASE_URL) {
      this.checkFormat(
        'SUPABASE_URL',
        env.SUPABASE_URL,
        /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
        'Should be https://your-project.supabase.co'
      );
    }

    return hasUrl && hasServiceKey && hasAnonKey;
  }

  validateEmail(env) {
    log('\n📧 Email Configuration (SMTP)', colors.bold);
    
    const hasHost = this.checkOptional(
      'SMTP_HOST',
      env.SMTP_HOST,
      'SMTP host for sending emails'
    );

    const hasUser = this.checkOptional(
      'SMTP_USER',
      env.SMTP_USER,
      'SMTP username'
    );

    const hasPassword = this.checkOptional(
      'SMTP_PASSWORD',
      env.SMTP_PASSWORD,
      'SMTP password'
    );

    const hasFrom = this.checkOptional(
      'SMTP_FROM_EMAIL',
      env.SMTP_FROM_EMAIL,
      'From email address'
    );

    if (!hasHost || !hasUser || !hasPassword || !hasFrom) {
      this.warnings.push('⚠️  Email features (confirmations, password resets) will not work');
    }

    return hasHost && hasUser && hasPassword && hasFrom;
  }

  validateSMS(env) {
    log('\n📱 SMS/WhatsApp Configuration (Twilio)', colors.bold);
    
    const hasAccountSid = this.checkOptional(
      'TWILIO_ACCOUNT_SID',
      env.TWILIO_ACCOUNT_SID,
      'Twilio Account SID'
    );

    const hasAuthToken = this.checkOptional(
      'TWILIO_AUTH_TOKEN',
      env.TWILIO_AUTH_TOKEN,
      'Twilio Auth Token'
    );

    const hasPhoneNumber = this.checkOptional(
      'TWILIO_PHONE_NUMBER',
      env.TWILIO_PHONE_NUMBER,
      'Twilio phone number for SMS'
    );

    const hasWhatsApp = this.checkOptional(
      'TWILIO_WHATSAPP_FROM',
      env.TWILIO_WHATSAPP_FROM,
      'Twilio WhatsApp sender'
    );

    if (!hasAccountSid || !hasAuthToken) {
      this.warnings.push('⚠️  OTP features (SMS/WhatsApp verification) will not work');
    }

    if (hasPhoneNumber && env.TWILIO_PHONE_NUMBER) {
      this.checkFormat(
        'TWILIO_PHONE_NUMBER',
        env.TWILIO_PHONE_NUMBER,
        /^\+\d{10,15}$/,
        'Should be in E.164 format (e.g., +1234567890)'
      );
    }

    return hasAccountSid && hasAuthToken && (hasPhoneNumber || hasWhatsApp);
  }

  validatePayment(env) {
    log('\n💳 Payment Configuration (Lenco)', colors.bold);
    
    const hasPublicKey = this.checkOptional(
      'VITE_LENCO_PUBLIC_KEY',
      env.VITE_LENCO_PUBLIC_KEY,
      'Lenco public key for frontend'
    );

    const hasSecretKey = this.checkOptional(
      'LENCO_SECRET_KEY',
      env.LENCO_SECRET_KEY,
      'Lenco secret key for backend'
    );

    const hasWebhookSecret = this.checkOptional(
      'LENCO_WEBHOOK_SECRET',
      env.LENCO_WEBHOOK_SECRET,
      'Lenco webhook secret for signature validation'
    );

    if (!hasPublicKey || !hasSecretKey || !hasWebhookSecret) {
      this.warnings.push('⚠️  Payment features will not work');
    }

    return hasPublicKey && hasSecretKey && hasWebhookSecret;
  }

  validateBackendAPI(env) {
    log('\n🔌 Backend API Configuration', colors.bold);
    
    const hasApiUrl = this.checkRequired(
      'VITE_API_BASE_URL',
      env.VITE_API_BASE_URL,
      'Backend API URL is required for frontend'
    );

    if (hasApiUrl && env.VITE_API_BASE_URL) {
      const isProduction = !env.VITE_API_BASE_URL.includes('localhost');
      if (isProduction) {
        this.checkFormat(
          'VITE_API_BASE_URL',
          env.VITE_API_BASE_URL,
          /^https:\/\//,
          'Production API URL must use HTTPS'
        );
      }
    }

    return hasApiUrl;
  }

  printReport() {
    log('\n' + '='.repeat(70), colors.blue);
    log('  CONFIGURATION VALIDATION REPORT', colors.bold + colors.blue);
    log('='.repeat(70), colors.blue);

    if (this.info.length > 0) {
      log('\n✅ Configured:', colors.green + colors.bold);
      this.info.forEach(msg => log(`   ${msg}`, colors.green));
    }

    if (this.warnings.length > 0) {
      log('\n⚠️  Warnings:', colors.yellow + colors.bold);
      this.warnings.forEach(msg => log(`   ${msg}`, colors.yellow));
    }

    if (this.errors.length > 0) {
      log('\n❌ Errors:', colors.red + colors.bold);
      this.errors.forEach(msg => log(`   ${msg}`, colors.red));
    }

    log('\n' + '='.repeat(70), colors.blue);

    if (this.errors.length === 0) {
      log('\n✨ Configuration validation passed!', colors.green + colors.bold);
      log('   All required settings are configured.', colors.green);
      
      if (this.warnings.length > 0) {
        log('\n⚠️  Some optional features are not configured.', colors.yellow);
        log('   The platform will work but with reduced functionality.', colors.yellow);
      }
      
      return true;
    } else {
      log('\n❌ Configuration validation failed!', colors.red + colors.bold);
      log(`   Found ${this.errors.length} error(s) that must be fixed.`, colors.red);
      log('\n   Please update your .env files with the required values.', colors.red);
      log('   See .env.example and backend/.env.example for templates.', colors.red);
      return false;
    }
  }

  validate(env) {
    log('\n🔍 Starting configuration validation...', colors.bold);

    this.validateDatabase(env);
    this.validateEmail(env);
    this.validateSMS(env);
    this.validatePayment(env);
    this.validateBackendAPI(env);

    return this.printReport();
  }
}

function main() {
  log('╔═══════════════════════════════════════════════════════════════════╗', colors.blue);
  log('║         WATHACI CONNECT - Configuration Validator                 ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════════════════╝', colors.blue);

  // Load environment files
  const rootEnv = loadEnvFile(join(__dirname, '..', '.env.production'));
  const backendEnv = loadEnvFile(join(__dirname, '..', 'backend', '.env.production'));

  // Merge configurations (backend env takes precedence for backend-specific vars)
  const env = { ...rootEnv, ...backendEnv, ...process.env };

  const validator = new ConfigValidator();
  const isValid = validator.validate(env);

  process.exit(isValid ? 0 : 1);
}

main();
