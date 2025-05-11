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

  try {
    const city = await translateCity(originalCity);

    // 🔍 lookup locationId
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    console.log("🔍 lookup URL:", lookupUrl);
    const lookupRes = await fetch(lookupUrl);
    const lookupText = await lookupRes.text();

    if (!lookupRes.ok || lookupText.includes("Unknown api method")) {
      console.error("❌ Ошибка от lookup API:", lookupText);
      throw new Error(`Lookup API вернул ошибку: ${lookupText}`);
    }

    let lookupData;
    try {
      lookupData = JSON.parse(lookupText);
    } catch {
      throw new Error("❌ Невалидный JSON от lookup API");
    }

    const locationId = lookupData?.results?.locations?.[0]?.id;
    if (!locationId) {
      console.warn("⚠️ Локация не найдена:", city);
      return res.status(404).json({ error: `Локация не найдена: ${city}` });
    }

    // 📦 cache API
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    console.log("📦 cache URL:", cacheUrl);
    const cacheRes = await fetch(cacheUrl);
    const rawText = await cacheRes.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.warn("⚠️ Невалидный JSON от cache API");
      data = null;
    }

    let hotels = Array.isArray(data) ? data.filter(h => h.priceFrom > 0) : [];

    // 🔁 fallback: search API
    if (!hotels.length) {
      console.log("🔁 Fallback на search API");

      const startRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: city,
          checkIn,
          checkOut,
          adultsCount: 2,
          language: "ru",
          currency: "usd",
          token,
          marker
        }),
      });

      const startJson = await startRes.json();
      const searchId = startJson?.searchId;
      if (!searchId) throw new Error("❌ searchId не получен");

      await new Promise(r => setTimeout(r, 2000));

      const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
      const resultsJson = await resultsRes.json();
      hotels = (resultsJson.results || []).filter(h => h.available && h.priceFrom > 0);
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const result = hotels.map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: Math.floor((h.priceFrom || h.priceAvg || 0) / nights),
      fullPrice: h.priceFrom || h.priceAvg || 0,
      rating: h.rating || (h.stars ? h.stars * 2 : 0),
      image: h.hotelId
        ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto`
        : null,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Полная ошибка:", err);
    return res.status(500).json({
      error: `❌ Ошибка при получении отелей: ${err.message || "Unknown error"}`,
    });
  }
};

export default hotelsHandler;
