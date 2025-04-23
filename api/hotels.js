export default async function handler(req, res) {
  // 🌐 CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 📍 Город из query
  const originalCity = req.query.city || "Paris";

  // 🔄 Перевод города, если нужно
  async function translateCity(city) {
    if (/^[a-zA-Z\s]+$/.test(city)) return city;

    try {
      const translateRes = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: city,
          source: "auto",
          target: "en",
          format: "text"
        })
      });

      const result = await translateRes.json();
      const translated = result?.translatedText || city;
      console.log(`📘 Перевод: "${city}" → "${translated}"`);
      return translated;
    } catch (err) {
      console.warn("⚠️ Ошибка перевода:", err);
      return city;
    }
  }

  const city = await translateCity(originalCity);
  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const apiUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=100&token=${token}`;

  try {
    const apiRes = await fetch(apiUrl);
    const contentType = apiRes.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      console.error("❌ Неверный content-type от API:", contentType);
      return res.status(500).json({ error: `HotelLook вернул неправильный content-type: ${contentType}` });
    }

    const data = await apiRes.json();

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
    console.error("❌ Ошибка запроса:", err);
    return res.status(500).json({ error: "Ошибка при запросе к HotelLook API" });
  }
}
