// /api/proxy-results.js
import fetch from "node-fetch";

const proxyResultsHandler = async (req, res) => {
  const { searchId } = req.query;

  // ✅ Проверка наличия параметра
  if (!searchId) {
    return res.status(400).json({ error: "❌ Не передан searchId" });
  }

  // ✅ CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const apiRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
    const rawText = await apiRes.text();
    console.log("📦 Ответ от HotelLook (text):", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      console.error("❌ Невалидный JSON от HotelLook:", err);
      return res.status(502).json({ error: "Ответ от API не является валидным JSON" });
    }

    const hotels = (data.results || [])
      .filter(h => h.available)
      .map(h => ({
        id: h.hotelId || h.id || null,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || "Город неизвестен",
        price: h.priceFrom || h.priceAvg || 0,
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        location: h.location || h.geo || null,
        image: h.hotelId
          ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto`
          : null
      }));

    return res.status(200).json(hotels);
  } catch (error) {
    console.error("❌ Ошибка proxy-results:", error);
    return res.status(500).json({ error: "Ошибка получения результатов поиска" });
  }
};

export default proxyResultsHandler;
