import fetch from "node-fetch";

export default async function hotelsHandler(req, res) {
  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupData = await lookupRes.json();
    const location = lookupData?.results?.locations?.[0];

    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackLocation = location.fullName || city;

    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const cacheData = await cacheRes.json();

    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const hotels = Array.isArray(cacheData)
      ? cacheData.filter(h => h.priceFrom > 0).map(h => ({
          id: h.hotelId || h.id || null,
          name: h.hotelName || h.name || "Без названия",
          city: h.city || fallbackLocation,
          price: Math.floor((h.priceFrom || h.priceAvg || 0) / nights),
          fullPrice: h.priceFrom || h.priceAvg || 0,
          rating: h.rating || (h.stars ? h.stars * 2 : 0),
          image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null,
        }))
      : [];

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err.message);
    return res.status(500).json({ error: `❌ ${err.message}` });
  }
}
