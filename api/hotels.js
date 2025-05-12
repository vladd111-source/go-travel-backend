import fetch from "node-fetch";

const hotelsHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city: originalCity = "Paris", checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
  }

  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const marker = 618281;

  const translateCity = async (city) => {
    if (/^[a-zA-Z\s]+$/.test(city)) return city;

    try {
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: city, source: "auto", target: "en", format: "text" })
      });
      const data = await res.json();
      return data?.translatedText || city;
    } catch {
      return city;
    }
  };

  try {
    const city = await translateCity(originalCity);

    // ✅ Lookup с проверкой типа контента
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);

    if (!lookupRes.ok) {
      const errorText = await lookupRes.text();
      throw new Error(`❌ Lookup API вернул ${lookupRes.status}: ${errorText}`);
    }

    const contentType = lookupRes.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const raw = await lookupRes.text();
      throw new Error(`❌ Lookup ответ не JSON: ${raw}`);
    }

    const lookupData = await lookupRes.json();

    const locations = lookupData?.results?.locations || [];
    const preferred = locations.find(loc => loc.countryCode === "FR") || locations[0];
    const locationId = preferred?.id;
    const fallbackLocation = preferred?.fullName || city;

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    // ✅ Получаем отели из cache API
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    let hotels = [];

    try {
      const contentType = cacheRes.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const cacheData = await cacheRes.json();
        hotels = Array.isArray(cacheData) ? cacheData.filter(h => h.priceFrom > 0) : [];
      } else {
        throw new Error(`Cache ответ не JSON: ${await cacheRes.text()}`);
      }
    } catch (e) {
      console.warn("⚠️ Cache API не вернул JSON:", e.message);
    }

    // 🔁 Если нет отелей — fallback на search API
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

      const startData = await startRes.json();
      const searchId = startData?.searchId;
      if (!searchId) throw new Error("❌ searchId не получен");

      await new Promise(r => setTimeout(r, 2000));

      const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
      const resultsJson = await resultsRes.json();
      hotels = (resultsJson.results || []).filter(h => h.available && h.priceFrom > 0);
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
    console.error("❌ Полная ошибка:", err.message || err);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
};

export default hotelsHandler;
