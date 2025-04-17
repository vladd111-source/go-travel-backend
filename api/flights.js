let lastRequestTime = 0;
const MIN_INTERVAL = 3000; // 3 сек
const iataCache = {}; // 🔁 Кэш для IATA-кодов

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(200).end();

  const now = Date.now();
  if (now - lastRequestTime < MIN_INTERVAL) {
    return res.status(429).json({ error: "⏳ Слишком много запросов. Подождите немного." });
  }
  lastRequestTime = now;

  const { from = "", to = "", date = "" } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ error: "⛔ Параметры запроса не заданы: from, to, date" });
  }

  const normalize = s => (s || "").trim().toLowerCase();

  const getIataCode = async (city) => {
    const key = normalize(city);
    if (iataCache[key]) {
      return iataCache[key]; // 🔁 Возврат из кэша
    }

    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(city)}&locale=ru&types[]=city`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      const match = json.find(item => {
        const name = normalize(item.name);
        const cityName = normalize(item.city_name);
        const code = normalize(item.code);
        return code === key || name === key || cityName.includes(key);
      });

      const code = match?.code || null;
      if (code) {
        iataCache[key] = code; // 🧠 Сохраняем в кэш
      }
      return code;
    } catch (err) {
      console.error("❌ IATA ошибка:", err);
      return null;
    }
  };

  const origin = from.length === 3 ? from.toUpperCase() : await getIataCode(from);
  const destination = to.length === 3 ? to.toUpperCase() : await getIataCode(to);

  if (!origin || !destination) {
    return res.status(400).json({ error: "⛔ Не удалось определить IATA-коды." });
  }

  console.log("🔍 IATA:", { origin, destination });

  const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${date}&currency=usd&token=067df6a5f1de28c8a898bc83744dfdcd`;

  try {
    const apiRes = await fetch(apiUrl);
    const result = await apiRes.json();

    if (Array.isArray(result?.data) && result.data.length > 0) {
      console.log(`✅ Найдено рейсов: ${result.data.length}`);
      return res.status(200).json(result.data);
    }

    console.warn("⚠️ Пустой ответ от API, используем моки.");
  } catch (err) {
    console.error("❌ Ошибка запроса к API:", err);
  }

  // 🧪 Fallback (моки)
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
      departure_at: `${date}T15:20:00`,
      price: 69,
      airline: "FR"
    }
  ]);
}
