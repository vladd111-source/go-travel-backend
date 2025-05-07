// /api/proxy-results.js
import fetch from "node-fetch";

const proxyResultsHandler = async (req, res) => {
  const { searchId } = req.query;

  if (!searchId) {
    return res.status(400).json({ error: "❌ Не передан searchId" });
  }

  try {
    const apiRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
    const data = await apiRes.json();

    const hotels = (data.results || []).filter(h => h.available).map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || "Город неизвестен",
      price: h.priceFrom || h.priceAvg || 0,
      rating: h.rating || (h.stars ? h.stars * 2 : 0),
      location: h.location || h.geo || null,
      image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null
    }));

    res.status(200).json(hotels);
  } catch (error) {
    console.error("❌ Ошибка получения результатов:", error);
    res.status(500).json({ error: "Ошибка получения результатов поиска" });
  }
};

export default proxyResultsHandler;
