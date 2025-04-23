export default async function handler(req, res) {
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

  const city = await translateCity(originalCity);
  const token = "067df6a5f1de28c8a898bc83744dfdcd";

  const baseParams = `location=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&adultsCount=1&currency=usd&limit=100&token=${token}`;
  const startUrl = `https://engine.hotellook.com/api/v2/start.json?${baseParams}`;
  const fallbackUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=100&token=${token}`;

  async function fetchHotels(url, expectResultsKey = false) {
    console.log("🌐 Запрос к:", url);

    const response = await fetch(url);
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      throw new Error(`❌ Ошибка запроса (${response.status}): ${await response.text()}`);
    }

    if (!contentType?.includes("application/json")) {
      throw new Error(`Неверный content-type: ${contentType}`);
    }

    const data = await response.json();
    return expectResultsKey ? data.results : data;
  }

  try {
    let data = await fetchHotels(startUrl, true);

    if (!Array.isArray(data)) throw new Error("start.json не вернул массив results");

    const hotels = data.map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceFrom || h.priceAvg || h.minimalPrice || 0,
      rating: h.rating || h.stars || 0,
      stars: h.stars || 0,
      location: h.location || h.geo || null,
    }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.warn("🔁 Ошибка с start.json, fallback на cache.json:", err.message);

    try {
      const fallbackData = await fetchHotels(fallbackUrl);

      if (!Array.isArray(fallbackData)) throw new Error("fallback тоже не вернул массив");

      const hotels = fallbackData.map(h => ({
        id: h.hotelId || h.id || null,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || city,
        price: h.priceFrom || h.priceAvg || h.minimalPrice || 0,
        rating: h.rating || h.stars || 0,
        stars: h.stars || 0,
        location: h.location || h.geo || null,
      }));

      return res.status(200).json(hotels);
    } catch (finalErr) {
      console.error("❌ Ошибка при обоих запросах:", finalErr);
      return res.status(500).json({ error: "Ошибка при получении данных из HotelLook API" });
    }
  }
}
