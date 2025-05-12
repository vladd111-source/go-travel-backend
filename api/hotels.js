import fetch from "node-fetch";

export default async function hotelsHandler(req, res) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите даты checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // Step 1: Lookup
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupText = await lookupRes.text();
    let location;
    try {
      const lookupData = JSON.parse(lookupText);
      location = lookupData?.results?.locations?.[0];
    } catch {
      throw new Error("❌ Lookup не вернул JSON: " + lookupText);
    }

    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;

    // Step 2: Start search
    const startRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "GoTravelBot/1.0"
      },
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

    const startText = await startRes.text();
    let startData;
    try {
      startData = JSON.parse(startText);
    } catch {
      throw new Error("❌ Start API не вернул JSON: " + startText);
    }

    const searchId = startData?.searchId;
    if (!searchId) throw new Error("❌ searchId отсутствует");

    // Step 3: Delay + Get results
    await new Promise(r => setTimeout(r, 2500));

    const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
    const resultsText = await resultsRes.text();
    let resultsData;
    try {
      resultsData = JSON.parse(resultsText);
    } catch {
      throw new Error("❌ Results API не вернул JSON: " + resultsText);
    }

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
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
}
