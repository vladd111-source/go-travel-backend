export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://go-travel-frontend.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const originalCity = req.query.city || "Paris";

  // 🔁 Перевод города (если не латиница)
  async function translateCityToEnglish(city) {
    // Проверка: если город уже на латинице — не переводим
    if (/^[a-zA-Z\s]+$/.test(city)) return city;

    try {
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: city,
          source: "auto",
          target: "en",
          format: "text"
        })
      });

      const data = await res.json();
      const translated = data?.translatedText || city;
      console.log(`📘 Перевод города: "${city}" → "${translated}"`);
      return translated;
    } catch (err) {
      console.warn("⚠️ Ошибка при переводе:", err);
      return city;
    }
  }

  const city = await translateCityToEnglish(originalCity);
  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const hotellookUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=30&token=${token}`;

  try {
    const response = await fetch(hotellookUrl);
    const data = await response.json();

    console.log("📦 Ответ от HotelLook API:", data);

    if (!Array.isArray(data)) {
      console.error("❌ HotelLook API вернул не массив:", data);
      return res.status(500).json({ error: "HotelLook API вернул не массив" });
    }

    const hotels = data.map(h => ({
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceAvg || h.minimalPrice || 0,
      rating: h.stars || h.rating || 0
    }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при запросе к HotelLook API:", err);
    return res.status(500).json({ error: "Ошибка получения данных из HotelLook" });
  }
}
