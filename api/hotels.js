import fetch from "node-fetch";

const hotelsHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city = "Paris", checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
  }

  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const marker = 618281;

  const safeJsonParse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`❌ Не валидный JSON: ${raw}`);
    }
  };

  try {
    // 🔍 Lookup
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupRaw = await lookupRes.text();
    const lookupData = safeJsonParse(lookupRaw);

    const location = lookupData?.results?.locations?.[0];
    const locationId = location?.id;
    const fallbackLocation = location?.fullName || city;

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    // 🧊 Cache API
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const cacheRaw = await cacheRes.text();

    let hotels = [];
    try {
      const cacheData = safeJsonParse(cacheRaw);
      hotels = Array.isArray(cacheData) ? cacheData.filter(h => h.priceFrom > 0) : [];
    } catch (err) {
      console.warn("⚠️ Cache ответ не JSON:", err.message);
    }

    // 🔁 Fallback на search
    if (!hotels.length) {
      const startRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          checkIn,
          checkOut,
          adultsCount: 2,
          language: "ru",
          currency: "usd",
          token,
          marker
        })
      });

      const startRaw = await startRes.text();
      const startData = safeJsonParse(startRaw);
      const searchId = startData?.searchId;
      if (!searchId) throw new Error("❌ searchId отсутствует");

      await new Promise(r => setTimeout(r, 2500));

      const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
      const resultsRaw = await resultsRes.text();
      const resultsData = safeJsonParse(resultsRaw);

      hotels = (resultsData.results || []).filter(h => h.available && h.priceFrom > 0);
    }

    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    const result = hotels.map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || fallbackLocation,
      price: Math.floor((h.priceFrom || h.priceAvg || 0) / nights),
      fullPrice: h.priceFrom || h.priceAvg || 0,
      rating: h.rating || (h.stars ? h.stars * 2 : 0),
      image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Полная ошибка:", err.stack || err);
    return res.status(500).json({ error: `❌ ${err.message}` });
  }
};

export default hotelsHandler;
