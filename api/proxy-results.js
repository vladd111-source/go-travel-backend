import fetch from "node-fetch";

const proxyResultsHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { searchId } = req.query;

  if (!searchId) {
    return res.status(400).json({ error: "❌ Не передан параметр searchId" });
  }

  try {
    const apiRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
    const rawText = await apiRes.text();

    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
      console.error("❌ Невалидный JSON от results API:", rawText);
      return res.status(502).json({ error: "Невалидный JSON от results API" });
    }

    const hotels = (json.results || []).filter(h => h.available && h.priceFrom > 0).map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || h.location?.name || "Город неизвестен",
      price: h.priceFrom || h.priceAvg || 0,
      rating: h.rating || (h.stars ? h.stars * 2 : 0),
      location: h.location || h.geo || null,
      image: h.hotelId
        ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto`
        : null,
    }));

    return res.status(200).json(hotels);
  } catch (error) {
    console.error("❌ Ошибка получения результатов:", error.message || error);
    return res.status(500).json({ error: "Ошибка получения результатов поиска" });
  }
};

export default proxyResultsHandler;
