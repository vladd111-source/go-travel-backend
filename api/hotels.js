import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { city = "Paris", checkIn, checkOut } = Object.fromEntries(url.searchParams.entries());

    if (!checkIn || !checkOut) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "❌ Укажите даты checkIn и checkOut" }));
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupJson = await lookupRes.json();

    const location = lookupJson?.results?.locations?.[0];
    if (!location?.id) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: `❌ Локация не найдена: ${city}` }));
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;
    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    if (nights > 30) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "⛔ Максимальный срок бронирования — 30 дней" }));
    }

    const resultUrl = `https://engine.hotellook.com/api/v2/search/getResult.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const resultRes = await fetch(resultUrl);
    const resultJson = await resultRes.json();

    const hotelsRaw = Array.isArray(resultJson.result)
      ? resultJson.result.filter(h => Array.isArray(h.rooms) && h.rooms.length > 0)
      : [];

    if (hotelsRaw.length === 0) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify([]));
    }

    const hotelIds = hotelsRaw.map(h => h.id).join(",");
    const photoApiUrl = `https://yasen.hotellook.com/photos/hotel_photos?id=${hotelIds}`;
    const photoRes = await fetch(photoApiUrl);
    const photoJson = await photoRes.json();

    const hotels = hotelsRaw.map(h => {
      const hotelId = h.id;
      const fullPrice = h.minPriceTotal || h.price || 0;

      const photos = photoJson[String(hotelId)] || [];
      const photoId = photos.length > 0 ? photos[0] : null;

      const imageUrl = photoId
        ? `https://go-travel-backend-86i8.onrender.com/api/image-proxy/${photoId}/800/520.jpg`
        : "https://via.placeholder.com/800x520?text=No+Image";

      return {
        id: hotelId,
        hotelId,
        name: h.name || "Без названия",
        city: h.city || fallbackCity,
        fullPrice,
        pricePerNight: Math.floor(fullPrice / nights),
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        image: imageUrl,
        rooms: h.rooms
      };
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(hotels));
  } catch (err) {
    console.error("❌ FULL ERROR:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      error: "❌ Ошибка при получении отелей",
      details: err.stack || err.message || String(err)
    }));
  }
}
