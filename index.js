// index.js
import express from "express";
import hotelsHandler from "./api/hotels.js";
import flightsHandler from "./api/flights.js";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Роуты
app.get("/api/hotels", hotelsHandler);
app.get("/api/flights", flightsHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend работает на http://localhost:${PORT}`);
});
