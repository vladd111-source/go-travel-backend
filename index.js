// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Пример маршрута
app.get('/', (req, res) => {
  res.send('🌍 Go Travel backend is running!');
});

// Пример маршрута для получения избранного
app.get('/favorites/:userId', (req, res) => {
  const { userId } = req.params;
  // Здесь пока просто мок-данные
  res.json({
    userId,
    favorites: []
  });
});

// Старт сервера
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
