import fetch from "node-fetch";

export default async function handler(req, res) {
  // ✅ CORS-заголовки для фронтенда
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight
  }

  try {
    const { city = "Paris", checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "❌ Укажите даты checkIn и checkOut" });
    }

    const token = "067df6a5f1de28c8a898bc83744dfdcd";
    const marker = 618281;

    // 🔍 Определение locationId по городу
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&token=${token}&marker=${marker}`;
    const lookupRes = await fetch(lookupUrl);
    const lookupType = lookupRes.headers.get("content-type");

    if (!lookupType || !lookupType.includes("application/json")) {
      const raw = await lookupRes.text();
      throw new Error(`❌ Lookup API не вернул JSON: ${raw}`);
    }

    const lookupJson = await lookupRes.json();
    const location = lookupJson?.results?.locations?.[0];

    if (!location?.id) {
      return res.status(404).json({ error: `❌ Локация не найдена: ${city}` });
    }

    const locationId = location.id;
    const fallbackCity = location.fullName || city;

    // 🔎 Запрос на реальные доступные отели
    const searchUrl = `https://engine.hotellook.com/api/v2/search.json?locationId=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&limit=100&token=${token}&marker=${marker}`;
    const searchRes = await fetch(searchUrl);
    const searchType = searchRes.headers.get("content-type");

    if (!searchType || !searchType.includes("application/json")) {
      const raw = await searchRes.text();
      throw new Error(`❌ Search API не вернул JSON: ${raw}`);
    }

    const searchData = await searchRes.json();
    const nights = Math.max(1, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    const hotels = Array.isArray(searchData)
      ? searchData
          .filter(h => h.priceFrom > 0 && (h.hotelId || h.id))
          .map(h => {
            const hotelId = h.hotelId || h.id;
            const fullPrice = h.priceFrom || 0;

            return {
              id: hotelId,
              hotelId,
              name: h.hotelName || h.name || "Без названия",
              city: h.city || fallbackCity,
              fullPrice,
              pricePerNight: Math.floor(fullPrice / nights),
              rating: h.rating || (h.stars ? h.stars * 2 : 0),
              image: hotelId
                ? `https://photo.hotellook.com/image_v2/limit/${hotelId}/800/520.auto`
                : null
            };
          })
      : [];

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка:", err.stack || err.message);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
}
