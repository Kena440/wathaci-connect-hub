import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfConfigPresent = supabaseUrl && serviceRoleKey ? describe : describe.skip;

describeIfConfigPresent('profiles upsert flow (service role)', () => {
  const client = createClient(supabaseUrl as string, serviceRoleKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  it('creates or updates a profile row via onConflict=id', async () => {
    const email = `profile-upsert-${Date.now()}@example.com`;
    const password = 'TempPass123!';

    const { data: userResult, error: userError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    expect(userError).toBeNull();
    expect(userResult?.user).toBeDefined();

    const profilePayload = {
      id: userResult!.user!.id,
      email,
      account_type: 'sme',
      profile_completed: false,
      msisdn: '+260' + Math.floor(Math.random() * 10_000_0000).toString().padStart(8, '0'),
    } as const;

    const { data, error } = await client
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(profilePayload.id);
    expect(data?.account_type).toBe('sme');

    await client.auth.admin.deleteUser(userResult!.user!.id);
  }, 30000);
});

// Keep a placeholder test so the file is recognized even without env vars
if (!supabaseUrl || !serviceRoleKey) {
  describe('profiles upsert flow (service role)', () => {
    it.skip('requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run', () => {
      expect(true).toBe(true);
    });
  });
}
