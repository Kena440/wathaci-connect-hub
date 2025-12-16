import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import dbSchema from '../supabase/db-schema.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const contractPath = resolve(__dirname, '../src/lib/contracts/smeProfileContract.ts');
const source = readFileSync(contractPath, 'utf8');

const dbColumnMatches = [...source.matchAll(/dbColumn:\s*'([^']+)'/g)].map(([, column]) => column);
const allowedColumns = Array.from(new Set([...dbColumnMatches, 'user_id', 'updated_at']));

const fieldMatches = [...source.matchAll(/(\w+):\s*\{\s*\n\s*dbColumn:/g)].map((match) => match[1]);
const snapshotColumns = new Set(dbSchema.tables.sme_profiles.columns);

test('uses DB columns that exist in the schema snapshot', () => {
  const missingColumns = allowedColumns.filter((column) => !snapshotColumns.has(column));
  assert.equal(missingColumns.length, 0, `Missing columns in schema snapshot: ${missingColumns.join(', ')}`);
});

test('documents all UI to DB mappings', () => {
  const missingMappings = fieldMatches.filter((field) => !field);
  assert.equal(missingMappings.length, 0, 'Every field should declare a dbColumn mapping');
});
