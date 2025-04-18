let hotDealsCache = {};
let lastUpdate = 0;
const CACHE_TTL = 1000 * 60 * 15;

const token = "067df6a5f1de28c8a898bc83744dfdcd";

export default async function handler(req, res) {
  // ✅ Разрешаем запросы с фронтенда
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");

  const origin = (req.query.origin || "").toUpperCase().trim();
  const limit = parseInt(req.query.limit || "10", 10);
  const now = Date.now();

  console.log("🔧 Origin получен:", origin);

  if (!origin || origin.length !== 3) {
    console.warn("🚫 Некорректный origin:", origin);
    return res.status(400).json({ error: "Некорректный параметр origin (IATA-код)" });
  }

  const responseWrapper = (deals, title = `🔥 Горячие рейсы из ${origin}`) => {
    return res.status(200).json({ title, deals });
  };

  // 🔁 Кэш
  if (hotDealsCache[origin] && now - lastUpdate < CACHE_TTL) {
    console.log(`📦 Отдаём hot-deals из кэша (${origin})`);
    return responseWrapper(hotDealsCache[origin].slice(0, limit));
  }

  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 60);

  const dateFrom = start.toISOString().split("T")[0];
  const dateTo = end.toISOString().split("T")[0];

  const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&departure_at=${dateFrom}&return_at=${dateTo}&currency=usd&token=${token}`;

  try {
    console.log(`🌐 Запрос Aviasales для ${origin}: ${url}`);
    const apiRes = await fetch(url);

    if (!apiRes.ok) {
      console.error(`❌ Ошибка от API: ${apiRes.status} ${apiRes.statusText}`);
      return res.status(apiRes.status).json({ error: "Ошибка ответа от Aviasales API" });
    }

    const data = await apiRes.json();

    if (!Array.isArray(data.data)) {
      console.error("⚠️ Неожиданный формат ответа:", data);
      return res.status(500).json({ error: "Неверный формат ответа от API" });
    }

    if (data.data.length === 0) {
      console.warn(`📭 Нет направлений для ${origin}`);
      return responseWrapper([], `🔥 Нет доступных рейсов из ${origin}`);
    }

    const filtered = data.data
      .filter(f => f.found_direct)
      .sort((a, b) => a.price - b.price)
      .slice(0, limit)
      .map(f => ({
        ...f,
        highlight: true,
      }));

    hotDealsCache[origin] = filtered;
    lastUpdate = now;

    return responseWrapper(filtered);
  } catch (err) {
    console.error("❌ Ошибка запроса к Aviasales:", err);
    return res.status(500).json({ error: "Ошибка загрузки горячих предложений" });
  }
}
