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

  const token = "067df6a5f1de28c8a898bc83744dfdcd";
  const marker = 618281;
  const city = await translateCity(originalCity);

  try {
    // 🔎 Шаг 1: старт поиска
    const startRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
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
      }),
    });

    const startData = await startRes.json();
    const searchId = startData.searchId;
    if (!searchId) throw new Error("Не удалось получить searchId");

    // 🕓 Подождать перед запросом (API async)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 🏨 Шаг 2: получить результаты
    const resultsUrl = `https://engine.hotellook.com/api/v2/search/results.json?searchId=${searchId}`;
    const resultsRes = await fetch(resultsUrl);
    if (!resultsRes.ok) throw new Error(`Ошибка получения результатов: ${resultsRes.status}`);
    const data = await resultsRes.json();

    if (!Array.isArray(data.results)) {
      throw new Error("Результаты не в массиве");
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const hotels = data.results
      .filter(h => h.available) // ✅ Только с доступными местами
      .map(h => ({
        id: h.hotelId || h.id || null,
        name: h.hotelName || h.name || "Без названия",
        city: h.location?.name || city,
        price: h.priceAvg ? Math.floor(h.priceAvg / nights) : 0,
        rating: h.rating || (h.stars ? h.stars * 2 : 0),
        location: h.location || null,
        image: h.hotelId ? `https://photo.hotellook.com/image_v2/limit/${h.hotelId}/800/520.auto` : null,
      }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при получении отелей:", err.message);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
};

export default hotelsHandler;
