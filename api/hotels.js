import fetch from "node-fetch";

const isJson = (res) => {
  const type = res.headers.get("content-type");
  return type && type.includes("application/json");
};

const safeJsonParse = async (res) => {
  const text = await res.text();
  if (!isJson(res)) {
    throw new Error(`❌ Невалидный JSON (content-type): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`❌ Ошибка парсинга JSON: ${text}`);
  }
};

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

  try {
    // 🔍 Lookup
    const lookupRes = await fetch(`https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`);
    const lookupData = await safeJsonParse(lookupRes);

    const location = lookupData?.results?.locations?.[0];
    const locationId = location?.id;
    const fallbackLocation = location?.fullName || city;

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    // 📦 Cache
    const cacheRes = await fetch(`https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`);
    let hotels = [];

    try {
      const cacheData = await safeJsonParse(cacheRes);
      hotels = Array.isArray(cacheData) ? cacheData.filter(h => h.priceFrom > 0) : [];
    } catch (err) {
      console.warn("⚠️ Cache API не вернул JSON:", err.message);
    }

    // 🔁 Fallback search
    if (!hotels.length) {
      const startRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, checkIn, checkOut, adultsCount: 2, language: "ru", currency: "usd", token, marker }),
      });

      const startData = await safeJsonParse(startRes);
      const searchId = startData?.searchId;
      if (!searchId) throw new Error("❌ searchId отсутствует");

      await new Promise((r) => setTimeout(r, 2500));

      const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
      const resultsData = await safeJsonParse(resultsRes);
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
      image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Полная ошибка:", err.stack || err.message || err);
    return res.status(500).json({ error: `❌ Ошибка: ${err.message}` });
  }
};

export default hotelsHandler;
