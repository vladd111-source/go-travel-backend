import express from "express";
import hotelsHandler from "./api/hotels.js";
import flightsHandler from "./api/flights.js";
import proxySearchHandler from "./api/proxy-search.js";
import proxyResultsHandler from "./api/proxy-results.js"; // 🔥 добавлено

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // обязательно для POST

// ✅ CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ✅ Роуты
app.get("/api/hotels", hotelsHandler);
app.get("/api/flights", flightsHandler);
app.post("/api/proxy-search", proxySearchHandler);
app.get("/api/proxy-results", proxyResultsHandler); // 🔥 добавлено

app.listen(PORT, () => {
  console.log(`✅ Backend работает на http://localhost:${PORT}`);
});
