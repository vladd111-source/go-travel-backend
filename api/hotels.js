import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите даты checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // 🔍 Step 1: Lookup
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    console.log("🌍 Lookup URL:", lookupUrl);
    const lookupRes = await fetch(lookupUrl);
    const lookupType = lookupRes.headers.get("content-type");

    if (!lookupType || !lookupType.includes("application/json")) {
      const raw = await lookupRes.text();
      throw new Error(`❌ Lookup не вернул JSON: ${raw}`);
    }

    const lookupJson = await lookupRes.json();
    const location = lookupJson?.results?.locations?.[0];

    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;

    // 🚀 Step 2: Start Search
    const startUrl = "https://engine.hotellook.com/api/v2/search/start";
    console.log("🚀 Start URL:", startUrl);
    const startRes = await fetch(startUrl, {
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

    const startType = startRes.headers.get("content-type");
    if (!startType || !startType.includes("application/json")) {
      const raw = await startRes.text();
      throw new Error(`❌ Start API не вернул JSON: ${raw}`);
    }

    const startData = await startRes.json();
    const searchId = startData?.searchId;
    if (!searchId) throw new Error("❌ searchId отсутствует");

    await new Promise(r => setTimeout(r, 2500)); // wait for results

    // 📥 Step 3: Get Results
    const resultsUrl = `https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`;
    console.log("📥 Results URL:", resultsUrl);
    const resultsRes = await fetch(resultsUrl);
    const resultsType = resultsRes.headers.get("content-type");

    if (!resultsType || !resultsType.includes("application/json")) {
      const raw = await resultsRes.text();
      throw new Error(`❌ Results API не вернул JSON: ${raw}`);
    }

    const resultsData = await resultsRes.json();
    const hotels = (resultsData.results || []).filter(h => h.available && h.priceFrom > 0);

    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const mapped = hotels.map(h => ({
      id: h.hotelId || h.id,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || fallbackCity,
      price: Math.floor(h.priceFrom / nights),
      fullPrice: h.priceFrom,
      rating: h.rating || (h.stars ? h.stars * 2 : 0),
      image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null
    }));

    return res.status(200).json(mapped);
  } catch (err) {
    console.error("❌ Ошибка:", err.message || err.stack);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
}
