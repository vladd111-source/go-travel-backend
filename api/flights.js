const requestLog = {};
const iataCache = {};
const MIN_INTERVAL = 3000;
const IATA_INTERVAL = 5000;

const iataQueue = [];
let processingQueue = false;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(200).end();

  const now = Date.now();
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";

  if (!requestLog[ip]) requestLog[ip] = { lastRequest: 0 };

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

  const getIataQueued = city => {
    return new Promise(resolve => {
      iataQueue.push({ city, resolve });
      processIataQueue();
    });
  };

  async function processIataQueue() {
    if (processingQueue || iataQueue.length === 0) return;

    processingQueue = true;

    while (iataQueue.length > 0) {
      const { city, resolve } = iataQueue.shift();
      const key = normalize(city);

      if (iataCache[key]) {
        resolve(iataCache[key]);
        continue;
      }

      const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(city)}&locale=en&types[]=city`;

      let foundCode = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(url);

          if (res.status === 429) {
            console.warn(`⚠️ 429 от IATA (${city}), попытка ${attempt + 1}`);
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

          foundCode = match?.code?.toUpperCase() || fallbackCodes[key] || null;

          if (foundCode) {
            iataCache[key] = foundCode;
            break;
          }

        } catch (err) {
          console.error(`❌ Ошибка запроса IATA (${city}):`, err);
          await delay(500);
        }
      }

      if (!foundCode) {
        console.warn(`⚠️ Fallback IATA (${city})`);
        foundCode = fallbackCodes[key] || null;
      }

      resolve(foundCode);
      await delay(500); // 🔄 небольшой буфер, чтобы не триггерить лимиты
    }

    processingQueue = false;
  }

  const origin = from.length === 3 ? from.toUpperCase() : await getIataQueued(from);
  const destination = to.length === 3 ? to.toUpperCase() : await getIataQueued(to);

  if (!origin || !destination) {
    return res.status(400).json({ error: "⛔ Не удалось определить IATA-коды." });
  }

  console.log("🔍 Запрос:", { origin, destination, date, ip });

 const selectedClass = document.getElementById("flightClass")?.value || "Y";

const url = `https://go-travel-backend.onrender.com/api/flights?from=${from}&to=${to}&date=${date}&class=${selectedClass}`; 

  try {
    const apiRes = await fetch(apiUrl);
    const result = await apiRes.json();

    console.log("📦 Полный ответ от API:", JSON.stringify(result, null, 2));
    
    if (Array.isArray(result?.data) && result.data.length > 0) {
      console.log(`✅ Найдено рейсов: ${result.data.length}`);
      return res.status(200).json(result.data);
    }

    console.warn("⚠️ API пуст. Используем моки.");
  } catch (err) {
    console.error("❌ Ошибка при запросе к API Aviasales:", err);
  }

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
