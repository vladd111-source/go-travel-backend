import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { city = "Paris", checkIn, checkOut } = Object.fromEntries(url.searchParams.entries());

    if (!checkIn || !checkOut) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "❌ Укажите даты checkIn и checkOut" }));
      return;
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // 🔍 Получаем locationId
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupJson = await lookupRes.json();
    console.log("📍 Location lookup result:", JSON.stringify(lookupJson, null, 2));

    const location = lookupJson?.results?.locations?.[0];
    if (!location?.id) {
      console.warn(`❌ Локация не найдена: ${city}`);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `❌ Локация не найдена: ${city}` }));
      return;
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;
    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    // 📦 Получаем отели
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const cacheRes = await fetch(cacheUrl);
    const cacheData = await cacheRes.json();
    console.log("🏨 Raw hotel cache data length:", Array.isArray(cacheData) ? cacheData.length : "Invalid");

    const hotelsRaw = Array.isArray(cacheData)
      ? cacheData.filter(h => h.priceFrom > 0 && h.hotelId)
      : [];

    console.log("✅ Filtered hotel list length:", hotelsRaw.length);

    const hotelIds = hotelsRaw.map(h => h.hotelId).join(",");

    // 🖼 Получаем фото
    const photoApiUrl = `https://yasen.hotellook.com/photos/hotel_photos?id=${hotelIds}`;
    const photoRes = await fetch(photoApiUrl);
    const photoJson = await photoRes.json();
    console.log("🖼 Photo JSON keys count:", Object.keys(photoJson).length);

    // 🧱 Сбор финального списка
    const hotels = hotelsRaw.map(h => {
      const hotelId = h.hotelId;
      const fullPrice = h.priceFrom || 0;

      const photos = photoJson[String(hotelId)] || [];
      const photoId = photos.length > 0 ? photos[0] : null;
      
      console.log(`📸 Фотки для отеля ${hotelId}:`, photos);
      console.log(`📸 Выбранный photoId:`, photoId);
      const imageUrl = photoId
        ? `https://go-travel-backend-86i8.onrender.com/api/image-proxy/${photoId}/800/520.jpg`
        : "https://via.placeholder.com/800x520?text=No+Image";

      console.log(`🖼 ${hotelId}: image = ${imageUrl}`);

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

    console.log("📦 Final hotels count:", hotels.length);
    console.log("🧾 Первый отель:", JSON.stringify(hotels[0], null, 2));
    console.log("📤 Отправка JSON:", JSON.stringify(hotels.slice(0, 1), null, 2));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(hotels));
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err.message);
    console.error("❌ FULL ERROR:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "❌ Ошибка при получении отелей",
      details: err.stack || err.message || err
    }));
  }
}
