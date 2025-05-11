import fetch from "node-fetch";

const hotelsHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city: originalCity = "Paris", checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
  }

  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const marker = 618281;

  async function translateCity(city) {
    if (/^[a-zA-Z\s]+$/.test(city)) return city;
    try {
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: city, source: "auto", target: "en", format: "text" }),
      });
      const data = await response.json();
      return data?.translatedText || city;
    } catch (err) {
      console.warn("⚠️ Ошибка перевода:", err);
      return city;
    }
  }

  try {
    const city = await translateCity(originalCity);

    // Шаг 1: Старт поиска
    const searchStartRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: city,
        checkIn,
        checkOut,
        adultsCount: 2,
        language: "ru",
        currency: "usd",
        token,
        marker
      })
    });

    const startData = await searchStartRes.json();
    const searchId = startData.searchId;
    if (!searchId) throw new Error("⛔ Не получен searchId");

    // Подождать 2 секунды
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Шаг 2: Получение результатов
    const resultsRes = await fetch(`https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`);
    const resultsData = await resultsRes.json();

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const hotels = (resultsData.results || [])
      .filter(h => h.available && h.priceAvg > 0)
      .map(h => ({
        id: h.hotelId || h.id || null,
        name: h.hotelName || h.name || "Без названия",
        city: h.location?.name || city,
        price: Math.floor(h.priceAvg / nights),
        fullPrice: h.priceAvg,
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        image: h.hotelId
          ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto`
          : null,
      }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Полная ошибка:", err);
    return res.status(500).json({
      error: `❌ Ошибка при получении отелей: ${err.message || "Unknown error"}`
    });
  }
};

export default hotelsHandler;
