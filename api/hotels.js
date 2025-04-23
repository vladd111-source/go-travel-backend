export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city: originalCity = "Paris" } = req.query;

  async function translateCity(city) {
    if (/^[a-zA-Z\s]+$/.test(city)) return city;

    try {
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: city, source: "auto", target: "en", format: "text" }),
      });
      const data = await response.json();
      return data?.translatedText || city;
    } catch (err) {
      console.warn("⚠️ Ошибка перевода:", err);
      return city;
    }
  }

  const city = await translateCity(originalCity);
  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const fallbackUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=100&token=${token}`;

  try {
    const response = await fetch(fallbackUrl);
    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("❌ HotelLook API вернул не массив:", data);
      return res.status(500).json({ error: `HotelLook API вернул не массив: ${JSON.stringify(data)}` });
    }

    const hotels = data.map(h => ({
      id: h.id || null,
      name: h.name || "Без названия",
      city: h.city || city,
      price: h.priceFrom || h.priceAvg || 0,
      rating: h.rating || h.stars || 0,
      stars: h.stars || 0,
      location: h.location || null,
    }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при получении отелей:", err);
    return res.status(500).json({ error: "Ошибка при получении данных из HotelLook API" });
  }
}
