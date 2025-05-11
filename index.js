import express from "express";
import hotelsHandler from "./api/hotels.js";
import flightsHandler from "./api/flights.js";
import proxySearchHandler from "./api/proxy-search.js";
import proxyResultsHandler from "./api/proxy-results.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // обязательно для POST-запросов

// ✅ Корректный CORS middleware
app.use((req, res, next) => {
  const allowedOrigin = "https://go-travel-frontend.vercel.app";
  const origin = req.headers.origin;

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ✅ Роуты
app.get("/api/hotels", hotelsHandler);
app.get("/api/flights", flightsHandler);
app.post("/api/proxy-search", proxySearchHandler);
app.get("/api/proxy-results", proxyResultsHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend работает на http://localhost:${PORT}`);
});
