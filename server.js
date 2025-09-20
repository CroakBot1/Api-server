// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // 🔥 allow all origins by default

const BASES = [
  "https://api.binance.com",
  "https://croak-express-gateway-henna.vercel.app",
  "https://croak-bot-proxy-three.vercel.app",
  "https://croak-pwa.vercel.app"
];

async function detectBase() {
  for (const base of BASES) {
    try {
      const res = await fetch(base + "/api/v3/ping", { timeout: 5000 });
      if (res.ok) {
        console.log("✅ Using base:", base);
        return base;
      }
    } catch (err) {
      console.log("❌ Failed:", base);
    }
  }
  throw new Error("No working base found");
}

app.get("/prices", async (req, res) => {
  try {
    const base = await detectBase();

    const infoRes = await fetch(base + "/api/v3/exchangeInfo");
    const info = await infoRes.json();
    const symbols = info.symbols
      .filter(s => s.status === "TRADING")
      .map(s => s.symbol);

    const priceRes = await fetch(
      base + "/api/v3/ticker/price?symbols=" +
        encodeURIComponent(JSON.stringify(symbols))
    );
    const prices = await priceRes.json();

    res.setHeader("Access-Control-Allow-Origin", "*"); // 🔥 important for browser
    res.json({ base, count: prices.length, prices });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
