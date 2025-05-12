import express from "express";
import hotelsHandler from "./hotels.js";
import flightsHandler from "./flights.js"; // если есть
import proxySearchHandler from "./proxy-search.js";
import proxyResultsHandler from "./proxy-results.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ CORS Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://go-travel-frontend.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ✅ API routes
app.get("/api/hotels", hotelsHandler);
app.post("/api/proxy-search", proxySearchHandler);
app.get("/api/proxy-results", proxyResultsHandler);
// app.get("/api/flights", flightsHandler); // если используешь

app.listen(PORT, () => {
  console.log(`✅ Backend запущен: http://localhost:${PORT}`);
});
