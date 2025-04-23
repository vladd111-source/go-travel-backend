import express from 'express';
import hotels from './api/hotels.js';
import flights from './api/flights.js';
import hotDeals from './api/hot-deals.js';
import places from './api/places.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS (если нужно)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Роуты
app.get('/api/hotels', hotels);
app.get('/api/flights', flights);
app.get('/api/hot-deals', hotDeals);
app.get('/api/places', places);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Go Travel backend работает на http://localhost:${PORT}`);
});
