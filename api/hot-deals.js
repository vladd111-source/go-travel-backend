let hotDealsCache = [];
let lastUpdate = 0;
const CACHE_TTL = 1000 * 60 * 15; // 15 минут

const popularRoutes = [
  { from: "MOW", to: "ROM" },
  { from: "MOW", to: "IST" },
  { from: "MOW", to: "PAR" },
  { from: "MOW", to: "BUD" },
];

const token = "067df6a5f1de28c8a898bc83744dfdcd";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const now = Date.now();
  const limit = parseInt(req.query.limit || "10", 10);

  const responseWrapper = (data, title = "🔥 Горячие предложения") => {
    return res.status(200).json({ title, deals: data });
  };

  // Если кэш валиден — отдаём
  if (hotDealsCache.length && now - lastUpdate < CACHE_TTL) {
    console.log("📦 Отдаём hot-deals из кэша");
    return responseWrapper(hotDealsCache.slice(0, limit));
  }

  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 60);

  const dateFrom = start.toISOString().split("T")[0];
  const dateTo = end.toISOString().split("T")[0];

  const results = [];

  for (const route of popularRoutes) {
    const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${route.from}&destination=${route.to}&departure_at=${dateFrom}&return_at=${dateTo}&currency=usd&token=${token}`;

    try {
      const apiRes = await fetch(url);
      const data = await apiRes.json();

      if (Array.isArray(data.data)) {
        console.log(`📍 ${route.from} → ${route.to}: всего ${data.data.length} рейсов`);

        const filtered = data.data.filter(f => f.found_direct); // только прямые рейсы

        const enriched = filtered.map(f => ({
          ...f,
          highlight: true, // Подсвечиваем всё
        }));

        results.push(...enriched);
      }
    } catch (err) {
      console.warn("⚠️ Ошибка загрузки маршрута:", route, err);
    }
  }

  // Сортируем по цене
  results.sort((a, b) => (a.price || a.value) - (b.price || b.value));

  const top = results.slice(0, limit);
  hotDealsCache = top;
  lastUpdate = now;

  console.log(`✅ Итог: ${top.length} hot-deals`);
  return responseWrapper(top);
}
