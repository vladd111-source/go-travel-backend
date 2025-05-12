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

    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);

    if (!lookupRes.ok) {
      const raw = await lookupRes.text();
      throw new Error(`❌ Ошибка от lookup API (${lookupRes.status}): ${raw}`);
    }

    const contentType = lookupRes.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const raw = await lookupRes.text();
      throw new Error(`❌ Lookup API не вернул JSON: ${raw}`);
    }

    const lookupData = await lookupRes.json();
    const locations = lookupData?.results?.locations || [];
    const locationId = locations[0]?.id;
    const fallbackLocation = locations[0]?.fullName || city;

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);

    let hotels = [];
    try {
      const type = cacheRes.headers.get("content-type");
      if (!type?.includes("application/json")) throw new Error(await cacheRes.text());
      const data = await cacheRes.json();
      hotels = Array.isArray(data) ? data.filter(h => h.priceFrom > 0) : [];
    } catch (err) {
      console.warn("⚠️ Cache API не дал результатов:", err.message);
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
    console.error("❌ Полная ошибка:", err.stack || err);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
};

export default hotelsHandler;
