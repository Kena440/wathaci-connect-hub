import "dotenv/config";
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://nrjcbdrzaxqvomeogptf.supabase.co';

// IMPORTANT: we read the service role key from an env var
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Skipping profile upsert test: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(0);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

async function run() {
  const testId = '00000000-0000-4000-8000-000000000001'; // can be any UUID
  const payload = {
    id: testId,
    email: 'prod.test+1@wathaci.com',
    full_name: 'Test User',
    // add any other columns that DEFINITELY exist in public.profiles
    // e.g. account_type: 'SME'
  };

  const { data, error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  console.log('error:', error);
  console.log('data:', data);

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No data returned from upsert');
  }

  assert.strictEqual(data.id, testId, 'Returned id should match testId');

  console.log('✅ Upsert test succeeded');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
