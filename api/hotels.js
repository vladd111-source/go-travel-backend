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

  try {
    // 🔍 Получаем locationId
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupData = await lookupRes.json();
    const locationId = lookupData?.results?.locations?.[0]?.id;
    const fallbackLocation = lookupData?.results?.locations?.[0]?.fullName || city;

    if (!locationId) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    // 📦 Запрос только cache API (без fallback!)
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const data = await cacheRes.json();

    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const hotels = Array.isArray(data)
      ? data.filter(h => h.priceFrom > 0).map(h => ({
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
    console.error("❌ Ошибка сервера:", err.message || err);
    return res.status(500).json({ error: `❌ Ошибка сервера: ${err.message}` });
  }
};

export default hotelsHandler;
