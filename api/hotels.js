// Максимально улучшенный backend-обработчик для поиска отелей
export default async function handler(req, res) {
  // ✅ CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://go-travel-frontend.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ Параметры запроса
  const { city: originalCity = "Paris", checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: "❌ Требуются параметры checkIn и checkOut" });
  }

  // ✅ Перевод города на английский, если кириллица
  async function translateCityToEnglish(city) {
    if (/^[a-zA-Z\s]+$/.test(city)) return city;

    try {
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: city,
          source: "auto",
          target: "en",
          format: "text"
        })
      });

      const data = await response.json();
      const translated = data?.translatedText || city;
      console.log(`📘 Перевод города: "${city}" → "${translated}"`);
      return translated;
    } catch (err) {
      console.warn("⚠️ Ошибка перевода:", err);
      return city;
    }
  }

  const city = await translateCityToEnglish(originalCity);
  const token = "067df6a5f1de28c8a898bc83744dfdcd";

  // ✅ Новый endpoint с checkIn и checkOut
  const hotellookUrl = `https://engine.hotellook.com/api/v2/start.json?location=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&adultsCount=1&currency=usd&limit=100&token=${token}`;

  try {
    const response = await fetch(hotellookUrl);
    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      console.error("❌ Неверный content-type от HotelLook:", contentType);
      return res.status(500).json({ error: `HotelLook вернул неправильный content-type: ${contentType}` });
    }

    const data = await response.json();

    const hotelArray = Array.isArray(data) ? data : data?.results;

    if (!Array.isArray(hotelArray)) {
      console.error("❌ Ожидался массив отелей, получено:", data);
      return res.status(500).json({ error: `HotelLook API вернул не массив: ${JSON.stringify(data)}` });
    }

    const hotels = hotelArray.map(h => ({
      id: h.hotelId || h.id || null,
      name: h.hotelName || h.name || "Без названия",
      city: h.city || city,
      price: h.priceFrom || h.priceAvg || h.minimalPrice || 0,
      rating: h.rating || h.stars || 0,
      stars: h.stars || 0,
      location: h.location || h.geo || null
    }));

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка запроса к HotelLook API:", err);
    return res.status(500).json({ error: "Ошибка при обращении к HotelLook API" });
  }
}
