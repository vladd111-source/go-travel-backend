import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите даты checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // 🔍 Получаем locationId
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

    // 📦 Загружаем отели с доступными номерами
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const cacheData = await cacheRes.json();

    // 🔍 Фильтруем только те отели, где есть места
    const hotelsRaw = Array.isArray(cacheData)
      ? cacheData.filter(h => h.priceFrom > 0 && h.hotelId && h.hotelName)
      : [];

    const hotelIds = hotelsRaw.map(h => h.hotelId).join(",");

    // 🖼 Получаем фотографии
    let photoJson = {};
    try {
      const photoApiUrl = `https://yasen.hotellook.com/photos/hotel_photos?id=${hotelIds}`;
      const photoRes = await fetch(photoApiUrl);
      photoJson = await photoRes.json();
    } catch (err) {
      console.warn("⚠️ Ошибка при получении фотографий:", err.message);
    }

    // 📦 Формируем финальную выдачу
    const hotels = hotelsRaw.map(h => {
      const hotelId = h.hotelId;
      const fullPrice = h.priceFrom || 0;

      const photoList = photoJson?.[String(hotelId)];
      const photoId = Array.isArray(photoList) && photoList.length > 0 ? photoList.find(Boolean) : null;

      return {
        id: hotelId,
        hotelId,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || fallbackCity,
        fullPrice,
        pricePerNight: Math.floor(fullPrice / nights),
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        image: photoId
          ? `https://photo.hotellook.com/image_v2/limit/${photoId}/800/520.auto`
          : "https://placehold.co/800x520?text=No+Image"
      };
    });

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err.message);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
}
