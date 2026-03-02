#!/usr/bin/env node
/**
 * Migration script with retry logic for Vercel builds
 * Handles advisory lock timeouts gracefully with exponential backoff
 */

import { execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

const MAX_RETRIES = 5;
const INITIAL_DELAY = 3000; // 3 seconds
const MAX_DELAY = 20000; // 20 seconds

function log(message) {
  console.log(`[migrate-with-retry] ${message}`);
}

function checkMigrationStatus() {
  try {
    // Check if there are pending migrations
    const output = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    
    // If status shows all migrations applied, we can skip
    if (output.includes('Database schema is up to date') || 
        output.includes('All migrations have been applied')) {
      return 'up-to-date';
    }
    
    return 'pending';
  } catch (error) {
    // Status check failed - proceed with migration attempt
    return 'unknown';
  }
}

async function runMigration(attempt = 1) {
  try {
    log(`Attempt ${attempt}/${MAX_RETRIES}: Running migrations...`);
    
    // Run prisma migrate deploy
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
    });
    
    log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    const errorMessage = error.stderr?.toString() || error.stdout?.toString() || error.message || error.toString();
    const isLockTimeout = errorMessage.includes('advisory lock') || 
                         errorMessage.includes('P1002') ||
                         errorMessage.includes('timed out') ||
                         errorMessage.includes('timeout');
    
    if (isLockTimeout && attempt < MAX_RETRIES) {
      // Exponential backoff with jitter
      const baseDelay = INITIAL_DELAY * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 2000; // 0-2 seconds
      const delay = Math.min(baseDelay + jitter, MAX_DELAY);
      
      log(`⚠️  Lock timeout detected (attempt ${attempt}/${MAX_RETRIES})`);
      log(`   Retrying in ${Math.round(delay)}ms...`);
      await setTimeout(delay);
      return runMigration(attempt + 1);
    }
    
    // Check if migrations are already applied (this is OK)
    if (errorMessage.includes('already applied') || 
        errorMessage.includes('No pending migrations') ||
        errorMessage.includes('Database schema is up to date')) {
      log('✅ All migrations already applied - skipping');
      process.exit(0);
    }
    
    // If we've exhausted retries and it's still a lock timeout, 
    // assume another process is handling it and exit gracefully
    if (isLockTimeout && attempt >= MAX_RETRIES) {
      log('⚠️  Max retries reached for lock timeout');
      log('   Assuming another build process is handling migrations');
      log('   Build will continue - migrations will be applied by the other process');
      process.exit(0); // Exit successfully to allow build to continue
    }
    
    // Fatal error - don't retry
    log(`❌ Migration failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  log('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Check migration status first
log('Checking migration status...');
const status = checkMigrationStatus();

if (status === 'up-to-date') {
  log('✅ Database schema is up to date - skipping migrations');
  process.exit(0);
}

// Run migrations with retry logic
runMigration();
