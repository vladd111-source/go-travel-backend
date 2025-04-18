let hotDealsCache = {};
let lastUpdate = 0;
const CACHE_TTL = 1000 * 60 * 15; // 15 минут

const token = "067df6a5f1de28c8a898bc83744dfdcd";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const origin = (req.query.origin || "MOW").toUpperCase();
  const limit = parseInt(req.query.limit || "10", 10);
  const now = Date.now();

  const responseWrapper = (deals, title = "🔥 Горячие предложения") => {
    return res.status(200).json({ title, deals });
  };

  // 🔁 Кэш по origin
  if (hotDealsCache[origin] && now - lastUpdate < CACHE_TTL) {
    console.log(`📦 Отдаём hot-deals из кэша (${origin})`);
    return responseWrapper(hotDealsCache[origin].slice(0, limit));
  }

  // 🔍 Дата: ближайшие 60 дней
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 60);

  const dateFrom = start.toISOString().split("T")[0];
  const dateTo = end.toISOString().split("T")[0];

  const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&departure_at=${dateFrom}&return_at=${dateTo}&currency=usd&token=${token}`;

  try {
    const apiRes = await fetch(url);
    const data = await apiRes.json();

    if (!Array.isArray(data.data)) {
      return res.status(500).json({ error: "Ошибка формата ответа от API" });
    }

    console.log(`📍 ${origin}: получено ${data.data.length} направлений`);

    const filtered = data.data
      .filter(f => f.found_direct)
      .sort((a, b) => a.price - b.price)
      .slice(0, limit)
      .map(f => ({
        ...f,
        highlight: true,
      }));

    // 🧠 Кэшируем
    hotDealsCache[origin] = filtered;
    lastUpdate = now;

    return responseWrapper(filtered);
  } catch (err) {
    console.error("❌ Ошибка загрузки hot-deals:", err);
    return res.status(500).json({ error: "Ошибка загрузки горячих предложений" });
  }
}
