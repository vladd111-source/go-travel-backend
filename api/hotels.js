import fetch from "node-fetch";

export default async function hotelsHandler(req, res, next) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupRaw = await lookupRes.text();

    let locationId, fallbackLocation;
    try {
      const lookupData = JSON.parse(lookupRaw);
      const location = lookupData?.results?.locations?.[0];
      locationId = location?.id;
      fallbackLocation = location?.fullName || city;
    } catch {
      throw new Error("❌ Не удалось распарсить lookup ответ: " + lookupRaw);
    }

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const cacheRaw = await cacheRes.text();

    let hotels = [];
    try {
      const data = JSON.parse(cacheRaw);
      hotels = Array.isArray(data) ? data.filter(h => h.priceFrom > 0) : [];
    } catch {
      console.warn("⚠️ Не удалось распарсить cache JSON");
    }

    // fallback на search
    if (!hotels.length) {
      const startRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, checkIn, checkOut, adultsCount: 2, language: "ru", currency: "usd", token, marker })
      });

      const startRaw = await startRes.text();
      let searchId;
      try {
        const startData = JSON.parse(startRaw);
        searchId = startData?.searchId;
      } catch {
        throw new Error("❌ Не удалось распарсить start JSON: " + startRaw);
      }

      if (!searchId) throw new Error("❌ searchId отсутствует");

      await new Promise(r => setTimeout(r, 2000));

      const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
      const resultsRaw = await resultsRes.text();
      try {
        const resultsData = JSON.parse(resultsRaw);
        hotels = (resultsData.results || []).filter(h => h.available && h.priceFrom > 0);
      } catch {
        throw new Error("❌ Не удалось распарсить results JSON: " + resultsRaw);
      }
    }

    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const result = hotels.map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || fallbackLocation,
      price: Math.floor((h.priceFrom || h.priceAvg || 0) / nights),
      fullPrice: h.priceFrom || h.priceAvg || 0,
      rating: h.rating || (h.stars ? h.stars * 2 : 0),
      image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err);
    return res.status(500).json({ error: `❌ ${err.message}` });
  }
}
