import fetch from "node-fetch";

export default async function hotelsHandler(req, res) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // 🔍 Get locationId
    const lookupRes = await fetch(`https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`);
    const lookupType = lookupRes.headers.get("content-type") || "";
    if (!lookupType.includes("application/json")) {
      const raw = await lookupRes.text();
      throw new Error(`Lookup API не вернул JSON: ${raw}`);
    }

    const lookupJson = await lookupRes.json();
    const location = lookupJson?.results?.locations?.[0];
    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;

    // 📦 Cache API
    const cacheRes = await fetch(`https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`);
    const cacheType = cacheRes.headers.get("content-type") || "";
    if (!cacheType.includes("application/json")) {
      const raw = await cacheRes.text();
      throw new Error(`Cache API не вернул JSON: ${raw}`);
    }

    const cacheJson = await cacheRes.json();
    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const hotels = Array.isArray(cacheJson)
      ? cacheJson.filter(h => h.priceFrom > 0).map(h => ({
          id: h.hotelId || h.id,
          name: h.hotelName || h.name || "Без названия",
          city: h.city || fallbackCity,
          price: Math.floor(h.priceFrom / nights),
          fullPrice: h.priceFrom,
          rating: h.rating || (h.stars ? h.stars * 2 : 0),
          image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null
        }))
      : [];

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err.message);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
}
