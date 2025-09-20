// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🔹 Bases (mo-rotate/failover)
const BASES = [
  "https://api.binance.com",
  "https://croak-express-gateway-henna.vercel.app",
  "https://croak-bot-proxy-three.vercel.app",
  "https://croak-pwa.vercel.app"
];

// 🔹 Helper: safe JSON parse
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ Not valid JSON:", text.slice(0, 200));
    throw new Error("Invalid JSON response");
  }
}

// 🔹 Detect first working base
async function detectBase() {
  for (let base of BASES) {
    try {
      const res = await fetch(`${base}/api/v3/ping`, { timeout: 5000 });
      if (res.ok) {
        console.log("✅ Using base:", base);
        return base;
      }
    } catch (err) {
      console.error("❌ Failed base:", base, err.message);
    }
  }
  throw new Error("No working base found.");
}

// 🔹 Cache current base (auto-rotate if fail)
let currentBase = null;

async function getBase() {
  if (!currentBase) {
    currentBase = await detectBase();
  }
  return currentBase;
}

// 🔹 Generic proxy handler for all Binance endpoints
app.use("/api/v3/*", async (req, res) => {
  try {
    let base = await getBase();
    let targetUrl = base + req.originalUrl;

    let resp;
    try {
      resp = await fetch(targetUrl, { timeout: 8000 });
    } catch (err) {
      console.warn("⚠️ Base failed, rotating...");
      currentBase = null;
      base = await getBase();
      targetUrl = base + req.originalUrl;
      resp = await fetch(targetUrl, { timeout: 8000 });
    }

    const text = await resp.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Shortcut for prices
app.get("/prices", async (req, res) => {
  try {
    let base = await getBase();
    const resp = await fetch(`${base}/api/v3/ticker/price`, { timeout: 8000 });
    const data = await safeJson(resp);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Root route
app.get("/", (req, res) => {
  res.json({
    message: "API Proxy Server Running",
    keepalive: "/keep-alive",
    endpoints: ["/prices", "/api/v3/..."]
  });
});

// 🔹 Keep-alive route
app.get("/keep-alive", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 🔹 Self-ping every 4 minutes (prevent sleep on Render/Heroku)
const SELF_URL = process.env.SELF_URL || `http://localhost:${PORT}`;
setInterval(async () => {
  try {
    const res = await fetch(`${SELF_URL}/keep-alive`);
    console.log("🔄 Self-ping:", res.status);
  } catch (err) {
    console.error("❌ Self-ping failed:", err.message);
  }
}, 240000); // 4 minutes

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
