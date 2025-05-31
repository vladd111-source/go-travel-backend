import fetch from "node-fetch";

const PLACEHOLDER_IDS = ["69540", "92820"]; // Добавляй сюда, если найдёшь другие

const log = (...args) => process.env.NODE_ENV !== "production" && console.log(...args);

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

    // 📍 Город -> locationId
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupJson = await lookupRes.json();

    log("📍 Location lookup result:", JSON.stringify(lookupJson, null, 2));

    const location = lookupJson?.results?.locations?.[0];
    if (!location?.id) {
      console.warn(`❌ Локация не найдена: ${city}`);
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;
    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    // 📦 Кэш отелей
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const cacheData = await cacheRes.json();

    log("🏨 Raw hotel cache data length:", Array.isArray(cacheData) ? cacheData.length : "Invalid");

    const hotelsRaw = Array.isArray(cacheData)
      ? cacheData.filter(h => h.priceFrom > 0 && h.hotelId)
      : [];

    log("✅ Filtered hotel list length:", hotelsRaw.length);

    const hotelIds = hotelsRaw.map(h => h.hotelId).join(",");

    // 🖼 Фото
    const photoApiUrl = `https://yasen.hotellook.com/photos/hotel_photos?id=${hotelIds}`;
    const photoRes = await fetch(photoApiUrl);
    const photoJson = await photoRes.json();

    log("🖼 Photo JSON keys count:", Object.keys(photoJson).length);

    // 📋 Формируем список
    const hotels = hotelsRaw.map(h => {
      const hotelId = h.hotelId;
      const fullPrice = h.priceFrom || 0;

      const photos = (photoJson[String(hotelId)] || []).filter(
        pid => !PLACEHOLDER_IDS.includes(String(pid))
      );
      const photoId = photos.length > 0 ? photos[0] : null;

      log(`🖼 ${hotelId}: photoId =`, photoId);

      return {
        id: hotelId,
        hotelId,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || fallbackCity,
        fullPrice,
        pricePerNight: Math.floor(fullPrice / nights),
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        image: photoId
          ? `https://photo.hotellook.com/image_v2/limit/${photoId}/800/520.jpg`
          : "https://via.placeholder.com/800x520?text=No+Image"
      };
    });

    log("📦 Final hotels count:", hotels.length);

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err.message);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
}
