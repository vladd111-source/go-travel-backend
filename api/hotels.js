import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите даты checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // 🔍 Lookup
    const lookupRes = await fetch(`https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`);
    const lookupJson = await lookupRes.json();
    const location = lookupJson?.results?.locations?.[0];

    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;

    // 🚀 Search Start
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
    if (!searchId) throw new Error("❌ Не удалось получить searchId");

    await new Promise(r => setTimeout(r, 2500)); // Ожидание готовности результатов

    // 📥 Search Results
    const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
    const resultsData = await resultsRes.json();

    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const hotels = (resultsData.results || [])
      .filter(h => h.available && h.priceFrom > 0)
      .map(h => ({
        id: h.hotelId || h.id,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || fallbackCity,
        price: Math.floor(h.priceFrom / nights),
        fullPrice: h.priceFrom,
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null
      }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка:", err.message || err);
    return res.status(500).json({ error: `❌ ${err.message}` });
  }
}
