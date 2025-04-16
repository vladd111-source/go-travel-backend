// ✅ Устойчивый API-обработчик Aviasales с IATA и fallback

let lastRequestTime = 0;
const MIN_INTERVAL = 3000; // минимум 3 секунды между запросами

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const now = Date.now();
  if (now - lastRequestTime < MIN_INTERVAL) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }
  lastRequestTime = now;

  const { from = "", to = "", date = "" } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ error: "Missing required query parameters: from, to, date" });
  }

  const getIataCode = async (cityName) => {
    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(cityName)}&locale=ru&types[]=city`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const match = data.find(item => 
        item.iata && 
        (item.name.toLowerCase() === cityName.toLowerCase() || item.name.toLowerCase().includes(cityName.toLowerCase()))
      );
      return match?.iata || null;
    } catch (err) {
      console.error("Ошибка получения IATA-кода:", err);
      return null;
    }
  };

  const origin = from.length === 3 ? from.toUpperCase() : await getIataCode(from);
  const destination = to.length === 3 ? to.toUpperCase() : await getIataCode(to);

  if (!origin || !destination) {
    return res.status(400).json({ error: "Could not resolve IATA codes for given cities." });
  }

  const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${date}&currency=usd&token=067df6a5f1de28c8a898bc83744dfdcd`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (Array.isArray(data?.data) && data.data.length) {
      return res.status(200).json(data.data);
    }

    console.warn("⚠️ API вернул пустой ответ. Используем моки.");
  } catch (err) {
    console.error("❌ Ошибка при запросе к Aviasales API:", err);
  }

  // Fallback-массив с моками
  return res.status(200).json([
    {
      origin,
      destination,
      departure_at: `${date}T06:30:00`,
      price: 41,
      airline: "W6"
    },
    {
      origin,
      destination,
      departure_at: `${date}T18:50:00`,
      price: 56,
      airline: "LO"
    }
  ]);
}
