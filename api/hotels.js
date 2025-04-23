export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://go-travel-frontend.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const originalCity = req.query.city || "Paris";
  const checkIn = req.query.checkIn;
  const checkOut = req.query.checkOut;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Не хватает параметров checkIn и checkOut" });
  }

  // Перевод города
  async function translateCityToEnglish(city) {
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
      console.warn("⚠️ Ошибка перевода города:", err);
      return city;
    }
  }

  const city = await translateCityToEnglish(originalCity);
  const token = "067df6a5f1de28c8a898bc83744dfdcd";

  // 💡 Используем HotelLook start.json для запросов с датами
  const hotellookUrl = `https://engine.hotellook.com/api/v2/start.json?location=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&currency=usd&limit=100&token=${token}`;

  try {
    const response = await fetch(hotellookUrl);
    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      console.error("❌ HotelLook вернул неправильный content-type:", contentType);
      return res.status(500).json({ error: `HotelLook вернул неправильный content-type: ${contentType}` });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("❌ HotelLook API вернул не массив:", data);
      return res.status(500).json({ error: `HotelLook API вернул не массив: ${JSON.stringify(data)}` });
    }

    const hotels = data.map(h => ({
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceFrom || h.priceAvg || 0,
      rating: h.stars || h.rating || 0
    }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при запросе к HotelLook API:", err);
    return res.status(500).json({ error: "Ошибка получения данных из HotelLook" });
  }
}
