export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city: originalCity = "Paris", checkIn, checkOut } = req.query;
  const token = "067df6a5f1de28c8a898bc83744dfdcd";

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Параметры checkIn и checkOut обязательны" });
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
    } catch (e) {
      console.warn("⚠️ Ошибка перевода:", e);
      return city;
    }
  }

  const city = await translateCity(originalCity);
  const baseParams = `location=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&adultsCount=1&currency=usd&limit=100&token=${token}`;
  const startUrl = `https://engine.hotellook.com/api/v2/start.json?${baseParams}`;
  const fallbackUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&currency=usd&limit=100&token=${token}`;

  async function fetchHotels(url, expectResultsKey = false) {
    console.log("🌐 Запрос:", url);
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) throw new Error(`Ошибка ${response.status}: ${await response.text()}`);
    if (!contentType.includes("application/json")) throw new Error(`Неверный Content-Type: ${contentType}`);

    const data = await response.json();
    return expectResultsKey ? data?.results : data;
  }

  try {
    const hotels = await fetchHotels(startUrl, true);
    if (!Array.isArray(hotels)) throw new Error("start.json не вернул массив results");

    return res.status(200).json(hotels.map(formatHotel));
  } catch (e) {
    console.warn("🌀 Ошибка в start.json:", e.message);

    try {
      const fallback = await fetchHotels(fallbackUrl, false);
      if (!Array.isArray(fallback)) throw new Error("cache.json не вернул массив");

      return res.status(200).json(fallback.map(formatHotel));
    } catch (finalErr) {
      console.error("💥 fallback тоже упал:", finalErr.message);
      return res.status(500).json({ error: "❌ Ошибка при получении отелей" });
    }
  }

  function formatHotel(h) {
    return {
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceFrom || h.minimalPrice || h.priceAvg || 0,
      rating: h.rating || h.stars || 0,
      stars: h.stars || 0,
      location: h.location || h.geo || null,
    };
  }
}
