/**
 * Environment Configuration Validator
 * 
 * Validates that all required environment variables are set for production.
 * Provides helpful error messages when configuration is missing.
 */

const chalk = require('chalk') || { red: (s) => s, yellow: (s) => s, green: (s) => s };

/**
 * Required environment variables for auth functionality
 */
const REQUIRED_AUTH_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

/**
 * Required environment variables for production CORS
 */
const REQUIRED_CORS_VARS = [
  'CORS_ALLOWED_ORIGINS',
];

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_VARS = [
  'SMTP_HOST',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'FROM_EMAIL',
];

/**
 * Check if an environment variable is set and not a placeholder
 */
const isValidEnvVar = (value) => {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  
  // Check for common placeholder patterns
  const placeholders = [
    'your-',
    'undefined',
    'null',
    'placeholder',
    'change-me',
    'replace-me',
    'xxx',
  ];
  
  const lowerValue = trimmed.toLowerCase();
  return !placeholders.some((placeholder) => lowerValue.includes(placeholder));
};

/**
 * Validate environment configuration
 * 
 * @param {object} options - Validation options
 * @param {boolean} options.strict - Throw error if required vars are missing
 * @param {boolean} options.logWarnings - Log warnings for missing recommended vars
 * @returns {object} Validation results
 */
const validateEnv = (options = {}) => {
  const { strict = false, logWarnings = true } = options;
  
  const missing = {
    required: [],
    cors: [],
    recommended: [],
  };
  
  // Check required auth variables
  for (const varName of REQUIRED_AUTH_VARS) {
    if (!isValidEnvVar(process.env[varName])) {
      missing.required.push(varName);
    }
  }
  
  // Check CORS configuration
  for (const varName of REQUIRED_CORS_VARS) {
    if (!isValidEnvVar(process.env[varName])) {
      missing.cors.push(varName);
    }
  }
  
  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    if (!isValidEnvVar(process.env[varName])) {
      missing.recommended.push(varName);
    }
  }
  
  const isValid = missing.required.length === 0;
  const hasCorsConfig = missing.cors.length === 0;
  
  // Log results
  if (missing.required.length > 0) {
    console.error(chalk?.red?.('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:') || '\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.required.forEach((varName) => {
      console.error(chalk?.red?.(`  - ${varName}`) || `  - ${varName}`);
    });
    console.error('\nAuthentication will not work without these variables.');
    console.error('Please set them in your Vercel project settings or .env file.\n');
  }
  
  if (missing.cors.length > 0 && logWarnings) {
    console.warn(chalk?.yellow?.('\n⚠️  MISSING CORS CONFIGURATION:') || '\n⚠️  MISSING CORS CONFIGURATION:');
    missing.cors.forEach((varName) => {
      console.warn(chalk?.yellow?.(`  - ${varName}`) || `  - ${varName}`);
    });
    console.warn('\nWithout CORS configuration, all origins will be allowed (not recommended for production).');
    console.warn('Set CORS_ALLOWED_ORIGINS to a comma-separated list of allowed frontend URLs.\n');
  }
  
  if (missing.recommended.length > 0 && logWarnings) {
    console.warn(chalk?.yellow?.('\n⚠️  MISSING RECOMMENDED VARIABLES:') || '\n⚠️  MISSING RECOMMENDED VARIABLES:');
    missing.recommended.forEach((varName) => {
      console.warn(chalk?.yellow?.(`  - ${varName}`) || `  - ${varName}`);
    });
    console.warn('\nThese are optional but recommended for full functionality.\n');
  }
  
  if (isValid && hasCorsConfig) {
    console.log(chalk?.green?.('\n✅ Environment configuration is valid\n') || '\n✅ Environment configuration is valid\n');
  }
  
  // Throw error in strict mode if required vars are missing
  if (strict && !isValid) {
    throw new Error(
      `Missing required environment variables: ${missing.required.join(', ')}. ` +
      'Please set them in your Vercel project settings or .env file.'
    );
  }
  
  return {
    isValid,
    hasCorsConfig,
    missing,
  };
};

/**
 * Log current environment configuration status
 */
const logEnvStatus = () => {
  console.log('\n=== ENVIRONMENT CONFIGURATION STATUS ===\n');
  
  const authConfigured = isValidEnvVar(process.env.SUPABASE_URL) && 
                         isValidEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const corsConfigured = isValidEnvVar(process.env.CORS_ALLOWED_ORIGINS);
  
  const emailConfigured = isValidEnvVar(process.env.SMTP_HOST) && 
                          isValidEnvVar(process.env.SMTP_USERNAME);
  
  console.log(`Auth (Supabase):  ${authConfigured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`CORS:             ${corsConfigured ? '✅ Configured' : '⚠️  Using defaults (allow all)'}`);
  console.log(`Email (SMTP):     ${emailConfigured ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (corsConfigured) {
    const origins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
    console.log(`\nAllowed Origins (${origins.length}):`);
    origins.forEach((origin) => {
      console.log(`  - ${origin}`);
    });
  }
  
  console.log('\n========================================\n');
};

module.exports = {
  validateEnv,
  logEnvStatus,
  isValidEnvVar,
  REQUIRED_AUTH_VARS,
  REQUIRED_CORS_VARS,
  RECOMMENDED_VARS,
};
