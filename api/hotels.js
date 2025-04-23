const hotelsHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { city: originalCity = "Paris", checkIn, checkOut, minRating } = req.query;

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
  const url = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&currency=usd&limit=100&token=${token}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`❌ Ошибка запроса (${response.status}): ${text}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new Error(`❌ Неверный content-type: ${contentType}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("HotelLook API вернул не массив");
    }

    let hotels = data.map(h => {
      const id = h.hotelId || h.id || null;
      return {
        id,
        name: h.hotelName || h.name || "Без названия",
        city: h.city || city,
        price: h.priceFrom || h.priceAvg || 0,
        rating: h.rating || h.stars || 0,
        stars: h.stars || 0,
        location: h.location || h.geo || null,
        image: id ? `https://photo.hotellook.com/image_v2/limit/${id}/800/520.auto` : null
      };
    });

    // 🔎 Фильтрация по рейтингу (если задан minRating)
    if (minRating) {
      const min = parseFloat(minRating);
      if (!isNaN(min)) {
        hotels = hotels.filter(h => h.rating >= min);
      }
    }

    return res.status(200).json(hotels);
  } catch (err) {
    console.error("❌ Ошибка при получении отелей:", err.message);
    return res.status(500).json({ error: `❌ Ошибка при получении отелей: ${err.message}` });
  }
};

export default hotelsHandler;
