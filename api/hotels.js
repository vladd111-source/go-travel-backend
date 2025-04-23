// ✅ Максимально стабильный backend-обработчик поиска отелей
export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city: originalCity = "Paris", checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
  }

  // 🔁 Перевод города на английский, если не латиница
  async function translateCityToEnglish(city) {
    if (/^[a-zA-Z\s]+$/.test(city)) return city;

    try {
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: city, source: "auto", target: "en", format: "text" })
      });

      const data = await response.json();
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

  // Надёжный endpoint без ошибок — кэш с 100 отелями
  const hotellookUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=100&token=${token}`;

  try {
    const response = await fetch(hotellookUrl);
    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      console.error("❌ Неверный content-type от HotelLook:", contentType);
      return res.status(500).json({ error: `HotelLook вернул неправильный content-type: ${contentType}` });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("❌ HotelLook API вернул не массив:", data);
      return res.status(500).json({ error: `HotelLook API вернул не массив: ${JSON.stringify(data)}` });
    }

    // Формируем массив отелей
    const hotels = data.map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceFrom || h.priceAvg || h.minimalPrice || 0,
      rating: h.rating || h.stars || 0,
      stars: h.stars || 0,
      location: h.location || h.geo || null
    }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при запросе к HotelLook API:", err);
    return res.status(500).json({ error: "Ошибка при обращении к HotelLook API" });
  }
}
