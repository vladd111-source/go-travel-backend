const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.get("/api/flights", (req, res) => {
  res.json([
    { airline: "WizzAir", from: "Киев", to: "Берлин", price: 52, duration: "2ч 30м", transfers: 0 },
    { airline: "Lufthansa", from: "Киев", to: "Мюнхен", price: 120, duration: "2ч 10м", transfers: 0 },
    { airline: "Air France", from: "Киев", to: "Париж", price: 95, duration: "3ч 00м", transfers: 1 }
  ]);
});

app.get("/api/hotels", (req, res) => {
  res.json([
    { name: "Berlin Central Hotel", city: "Берлин", pricePerNight: 75, stars: 4 },
    { name: "München Plaza", city: "Мюнхен", pricePerNight: 90, stars: 5 },
    { name: "Paris Cozy Inn", city: "Париж", pricePerNight: 65, stars: 3 }
  ]);
});

app.get("/api/places", (req, res) => {
  res.json([
    { name: "Бранденбургские ворота", city: "Берлин", description: "Один из самых известных символов Берлина." },
    { name: "Английский сад", city: "Мюнхен", description: "Один из крупнейших городских парков в Европе." },
    { name: "Эйфелева башня", city: "Париж", description: "Знаменитая железная башня и символ Парижа." }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
