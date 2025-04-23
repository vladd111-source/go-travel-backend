export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://go-travel-frontend.vercel.app'); // 👈 твой фронт
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type');

  // Preflight (для CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { city = "Paris" } = req.query;
  const token = "067df6a5f1de28c8a898bc83744dfdcd"; // 👈 твой API токен
  const url = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=30&token=${token}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("📦 Ответ от HotelLook API:", data); // 👈 log для отладки

    if (!Array.isArray(data)) {
      const errorMessage = data.error || "HotelLook API вернул не массив";
      console.error("❌ Ошибка от API:", errorMessage);
      return res.status(500).json({ error: errorMessage });
    }

    const hotels = data.map(h => ({
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceAvg || h.minimalPrice || 0,
      rating: h.stars || h.rating || 0
    }));

    res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при запросе к HotelLook API:", err);
    res.status(500).json({ error: "Ошибка получения данных из HotelLook" });
  }
}
