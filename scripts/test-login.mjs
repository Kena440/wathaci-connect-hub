import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = "https://nrjcbdrzaxqvomeogptf.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  throw new Error("Set VITE_SUPABASE_ANON_KEY in your env before running this test.");
}

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = process.env.TEST_SUPABASE_EMAIL || "TEST_EMAIL_HERE";
  const password = process.env.TEST_SUPABASE_PASSWORD || "TEST_PASSWORD_HERE";

  console.log("Testing Supabase login", {
    email,
    passwordLength: password?.length ?? 0,
    url: SUPABASE_URL,
    anonKeyPreview: `${SUPABASE_ANON_KEY.slice(0, 6)}...${SUPABASE_ANON_KEY.slice(-4)}`,
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  console.log("error:", error);
  console.log("data:", data);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
