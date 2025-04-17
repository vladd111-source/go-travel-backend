let lastRequestTime = 0;
const MIN_INTERVAL = 3000; // минимум 3 секунды между запросами

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(200).end();

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

      console.log(`🔍 IATA search for "${cityName}" →`, data.map(d => `${d.name} (${d.code})`).slice(0, 3));

      const norm = (s) => (s || "").trim().toLowerCase();
      const normCity = norm(cityName);

      const match = data.find(item =>
        item.code &&
        (
          norm(item.name) === normCity ||
          norm(item.city_name)?.includes(normCity) ||
          norm(item.name)?.includes(normCity) ||
          norm(item.code) === normCity
        )
      );

      return match?.code || null;
    } catch (err) {
      console.error("❌ Ошибка получения IATA-кода:", err);
      return null;
    }
  };

  const origin = from.length === 3 ? from.toUpperCase() : await getIataCode(from);
  const destination = to.length === 3 ? to.toUpperCase() : await getIataCode(to);

  console.log("✈️ IATA:", { from, origin, to, destination });

  if (!origin || !destination) {
    return res.status(400).json({ error: "Could not resolve IATA codes for given cities." });
  }

  const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${date}&currency=usd&token=067df6a5f1de28c8a898bc83744dfdcd`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (Array.isArray(data?.data) && data.data.length) {
      console.log("✅ Найдено рейсов:", data.data.length);
      return res.status(200).json(data.data);
    }

    console.warn("⚠️ API вернул пустой массив. Используем моки.");
  } catch (err) {
    console.error("❌ Ошибка при запросе к Aviasales API:", err);
  }

  // Fallback (моки)
  return res.status(200).json([
    {
      origin,
      destination,
      departure_at: `${date}T08:00:00`,
      price: 50,
      airline: "W6"
    },
    {
      origin,
      destination,
      departure_at: `${date}T14:30:00`,
      price: 65,
      airline: "LO"
    }
  ]);
}
