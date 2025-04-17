const requestLog = {};
const iataCache = {};
const MIN_INTERVAL = 3000;      // Защита от флуда по IP
const IATA_INTERVAL = 5000;     // Защита от частых IATA-запросов

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(200).end();

  const now = Date.now();
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";

  if (!requestLog[ip]) requestLog[ip] = { lastRequest: 0, lastIataRequest: 0 };

  // 🚫 Частые основные запросы
  if (now - requestLog[ip].lastRequest < MIN_INTERVAL) {
    return res.status(429).json({ error: "⏳ Слишком много запросов. Подождите немного." });
  }
  requestLog[ip].lastRequest = now;

  const { from = "", to = "", date = "" } = req.query;
  if (!from || !to || !date) {
    return res.status(400).json({ error: "⛔ Параметры from, to и date обязательны." });
  }

  const normalize = s => (s || "").trim().toLowerCase();
  const fallbackCodes = {
    "париж": "PAR",
    "берлин": "BER",
    "москва": "MOW",
    "рим": "ROM"
  };

  const delay = ms => new Promise(res => setTimeout(res, ms));

  // 🔄 IATA с повтором
  const getIataCode = async (city) => {
    const key = normalize(city);
    if (iataCache[key]) return iataCache[key];

    if (now - requestLog[ip].lastIataRequest < IATA_INTERVAL) {
      console.warn(`⏳ IATA-запрос от ${ip} пропущен — слишком часто`);
      return fallbackCodes[key] || null;
    }

    requestLog[ip].lastIataRequest = now;
    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(city)}&locale=en&types[]=city`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 429) {
          console.warn(`⚠️ 429 при IATA, попытка ${attempt + 1}`);
          await delay(1000 * (attempt + 1));
          continue;
        }

        const json = await res.json();
        const match = json.find(item => {
          const code = normalize(item.code);
          const name = normalize(item.name);
          const cityName = normalize(item.city_name);
          return code === key || name === key || cityName.includes(key);
        });

        const code = match?.code?.toUpperCase() || fallbackCodes[key] || null;
        if (code) iataCache[key] = code;
        return code;

      } catch (err) {
        console.error("❌ Ошибка получения IATA:", err);
        await delay(500);
      }
    }

    console.warn("❌ Не удалось получить IATA, возвращаем fallback");
    return fallbackCodes[key] || null;
  };

  const origin = from.length === 3 ? from.toUpperCase() : await getIataCode(from);
  const destination = to.length === 3 ? to.toUpperCase() : await getIataCode(to);

  if (!origin || !destination) {
    return res.status(400).json({ error: "⛔ Не удалось определить IATA-коды." });
  }

  console.log("🔍 Запрос:", { origin, destination, date, ip });

  const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${date}&currency=usd&token=067df6a5f1de28c8a898bc83744dfdcd`;

  try {
    const apiRes = await fetch(apiUrl);
    const result = await apiRes.json();

    if (Array.isArray(result?.data) && result.data.length > 0) {
      console.log(`✅ Найдено рейсов: ${result.data.length}`);
      return res.status(200).json(result.data);
    }

    console.warn("⚠️ Пустой ответ от API. Используем моки.");
  } catch (err) {
    console.error("❌ Ошибка API Aviasales:", err);
  }

  // 🧪 Fallback
  return res.status(200).json([
    {
      origin,
      destination,
      departure_at: `${date}T08:30:00`,
      price: 55,
      airline: "W6"
    },
    {
      origin,
      destination,
      departure_at: `${date}T16:10:00`,
      price: 77,
      airline: "FR"
    }
  ]);
}
