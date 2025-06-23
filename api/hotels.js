import fetch from "node-fetch";

const corsOrigin = "https://go-travel-frontend.vercel.app";

export default async function handler(req, res) {
  // ✅ Установка CORS заголовков — до любой логики
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { city = "Paris", checkIn, checkOut } = Object.fromEntries(url.searchParams.entries());

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите даты checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupJson = await lookupRes.json();

    const location = lookupJson?.results?.locations?.[0];
    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;
    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    if (nights > 30) {
      return res.status(400).json({ error: "⛔ Максимальный срок бронирования — 30 дней" });
    }

    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const text = await cacheRes.text();

    let cacheData;
    try {
      cacheData = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "❌ Невалидный ответ от API",
        details: text
      });
    }

    const hotelsRaw = Array.isArray(cacheData)
      ? cacheData.filter(h => h.priceFrom > 0 && h.hotelId)
      : [];

    if (hotelsRaw.length === 0) {
      return res.status(200).json([]);
    }

    const hotelIds = hotelsRaw.map(h => h.hotelId).join(",");
    const photoApiUrl = `https://yasen.hotellook.com/photos/hotel_photos?id=${hotelIds}`;
    const photoRes = await fetch(photoApiUrl);
    const photoJson = await photoRes.json();

    const hotels = hotelsRaw.map(h => {
      const hotelId = h.hotelId;
      const fullPrice = h.priceFrom || 0;
      const photos = photoJson[String(hotelId)] || [];
      const photoId = photos.length > 0 ? photos[0] : null;

      const imageUrl = photoId
        ? `https://go-travel-backend-86i8.onrender.com/api/image-proxy/${photoId}/800/520.jpg`
        : "https://via.placeholder.com/800x520?text=No+Image";

      return {
        id: hotelId,
        hotelId,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || fallbackCity,
        fullPrice,
        pricePerNight: Math.floor(fullPrice / nights),
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        image: imageUrl
      };
    });

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ FULL ERROR:", err);
    return res.status(500).json({
      error: "❌ Ошибка при получении отелей",
      details: err.stack || err.message || String(err)
    });
  }
}
