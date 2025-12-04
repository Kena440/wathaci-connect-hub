// Load environment variables from backend/.env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();

// Core config from env
const PORT = process.env.PORT || 4000;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_session_secret_change_me";

// Supabase (server-side)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lenco
const LENCO_PUBLIC_KEY = process.env.LENCO_PUBLIC_KEY;
const LENCO_SECRET_KEY = process.env.LENCO_SECRET_KEY;
const LENCO_API_URL = process.env.LENCO_API_URL || "https://api.lenco.co/access/v2";
const LENCO_WEBHOOK_SECRET = process.env.LENCO_WEBHOOK_SECRET || "";

// Basic CORS + JSON config
app.use(
  cors({
    origin: APP_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json());

// ---------- HEALTH CHECK ----------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "wathaci-connect-backend",
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
    lencoConfigured: Boolean(LENCO_SECRET_KEY && LENCO_PUBLIC_KEY),
  });
});

// ---------- SIMPLE AUTH / SESSION STUB ----------
app.post("/api/auth/session", (req, res) => {
  const { userId, email } = req.body || {};

  if (!userId || !email) {
    return res.status(400).json({ error: "userId and email are required" });
  }

  const token = jwt.sign(
    { sub: userId, email },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    token,
    user: {
      id: userId,
      email,
    },
  });
});

// ---------- PAYMENTS: CREATE (mock / template) ----------
app.post("/api/payments/create", async (req, res) => {
  try {
    const { amount, currency, reference, metadata } = req.body || {};

    if (!amount || !currency) {
      return res.status(400).json({ error: "amount and currency are required" });
    }

    // For now, we mock the behaviour so your frontend can move ahead.
    // Later, you can replace this with a real Lenco call using LENCO_SECRET_KEY.
    const paymentRef = reference || `WATHACI-${Date.now()}`;

    // Example of what a future real call might look like:
    // if (!LENCO_SECRET_KEY) throw new Error("Lenco secret key not configured");

    // TODO: Integrate with Lenco API using LENCO_SECRET_KEY and LENCO_API_URL

    res.json({
      ok: true,
      paymentInitialized: true,
      provider: "lenco",
      reference: paymentRef,
      amount,
      currency,
      metadata: metadata || {},
      message: "Mock payment created successfully (update with real Lenco integration).",
    });
  } catch (err) {
    console.error("Error in /api/payments/create:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- LENCO WEBHOOK HANDLER (template) ----------
app.post("/api/lenco/webhook", (req, res) => {
  try {
    // If you want raw body for signature verification, you can adjust middleware.
    // For now we assume JSON body already parsed by express.json().
    const signature = req.headers["x-lenco-signature"] || req.headers["x-lenco-signature".toLowerCase()];

    if (!LENCO_WEBHOOK_SECRET) {
      console.warn("LENCO_WEBHOOK_SECRET is not set. Skipping signature verification.");
    } else if (!signature) {
      console.warn("Missing Lenco signature header");
      return res.status(400).json({ error: "Missing signature header" });
    } else {
      // This is a generic HMAC-SHA512 verification template.
      // Check with Lenco docs for the exact algorithm and header details.
      const computed = crypto
        .createHmac("sha512", LENCO_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body || {}))
        .digest("hex");

      if (computed !== signature) {
        console.warn("Invalid Lenco webhook signature");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    console.log("Received Lenco webhook:", req.body);

    // TODO: persist payment status to Supabase using SUPABASE_SERVICE_ROLE_KEY

    // Always respond quickly to webhook
    res.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/lenco/webhook:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- OPENAI ASSISTANT (simple stub) ----------
app.post("/api/openai/assistant", async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // TODO: integrate with real OpenAI API using process.env.OPENAI_API_KEY
    // For now, just echo back a mock response so your frontend works end-to-end.
    res.json({
      ok: true,
      reply: `This is a mock AI response to: "${prompt}". Wire this endpoint to OpenAI when ready.`,
    });
  } catch (err) {
    console.error("Error in /api/openai/assistant:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`Wathaci backend listening on http://localhost:${PORT}`);
});