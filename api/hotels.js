import fetch from "node-fetch";

export default async function hotelsHandler(req, res) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // Step 1: Lookup
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    console.log("🌍 Lookup URL:", lookupUrl);

    const lookupRes = await fetch(lookupUrl);
    const lookupText = await lookupRes.text();

    let locationId, fallbackLocation;
    try {
      const lookupData = JSON.parse(lookupText);
      const location = lookupData?.results?.locations?.[0];
      locationId = location?.id;
      fallbackLocation = location?.fullName || city;
      console.log("📌 locationId:", locationId);
    } catch {
      console.warn("❌ Lookup: не удалось распарсить JSON:", lookupText);
      return res.status(500).json({ error: "❌ Lookup API не вернул JSON" });
    }

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    // Step 2: Cache
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    console.log("📦 Cache URL:", cacheUrl);

    const cacheRes = await fetch(cacheUrl);
    const cacheText = await cacheRes.text();

    let hotels = [];
    try {
      const cacheData = JSON.parse(cacheText);
      hotels = Array.isArray(cacheData) ? cacheData.filter(h => h.priceFrom > 0) : [];
    } catch {
      console.warn("❌ Cache: не удалось распарсить JSON:", cacheText);
    }

    // Step 3: Search fallback
    if (!hotels.length) {
      const searchStartUrl = "https://engine.hotellook.com/api/v2/search/start";
      console.log("🔁 Start API URL:", searchStartUrl);

      const startRes = await fetch(searchStartUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "GoTravelBot/1.0"
        },
        body: JSON.stringify({ locationId, checkIn, checkOut, adultsCount: 2, language: "ru", currency: "usd", token, marker })
      });

      const startText = await startRes.text();
      let searchId;
      try {
        const startData = JSON.parse(startText);
        searchId = startData?.searchId;
        console.log("🔁 searchId:", searchId);
      } catch {
        console.warn("❌ Start API: не JSON:", startText);
        return res.status(500).json({ error: `❌ Ошибка JSON от Start API: ${startText}` });
      }

      if (!searchId) throw new Error("❌ searchId отсутствует");

      await new Promise(r => setTimeout(r, 2000));

      const resultsUrl = `https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`;
      console.log("📥 Results URL:", resultsUrl);

      const resultsRes = await fetch(resultsUrl);
      const resultsText = await resultsRes.text();

      try {
        const resultsData = JSON.parse(resultsText);
        hotels = (resultsData.results || []).filter(h => h.available && h.priceFrom > 0);
      } catch {
        console.warn("❌ Results API: не JSON:", resultsText);
        return res.status(500).json({ error: `❌ Ошибка JSON от Results API: ${resultsText}` });
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
    console.error("❌ Ошибка:", err.stack || err.message);
    return res.status(500).json({ error: `❌ ${err.message}` });
  }
}
