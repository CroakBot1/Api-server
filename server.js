import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// 🔹 API Bases (imo list)
const BASES = [
  "https://api.binance.com",
  "https://croak-express-gateway-henna.vercel.app",
  "https://croak-bot-proxy-three.vercel.app",
  "https://croak-pwa.vercel.app"
];

// 🔹 Index para mag-rotate
let baseIndex = 0;

// 🔹 Get next base in rotation
function getNextBase() {
  const base = BASES[baseIndex];
  baseIndex = (baseIndex + 1) % BASES.length; // balik sa 0 kung naabot sa last
  return base;
}

// 🔹 Safe JSON parser
async function safeJson(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error("Expected JSON but got: " + text.slice(0, 100));
  }
  return res.json();
}

// 🔹 API endpoint
app.get("/prices", async (req, res) => {
  const pairs = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
  const tried = [];

  for (let i = 0; i < BASES.length; i++) {
    const base = getNextBase();
    tried.push(base);
    try {
      console.log("🔄 Trying base:", base);
      const priceRes = await fetch(
        base + "/api/v3/ticker/price?symbols=" + encodeURIComponent(JSON.stringify(pairs)),
        { timeout: 7000 }
      );

      const prices = await safeJson(priceRes);

      console.log("✅ Success via:", base);
      return res.json({ base, count: prices.length, prices });
    } catch (err) {
      console.error("❌ Failed base:", base, "-", err.message);
    }
  }

  res.status(500).json({ error: "All bases failed", tried });
});

// 🔹 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
