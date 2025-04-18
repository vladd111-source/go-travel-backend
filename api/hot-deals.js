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
  const maxPrice = parseFloat(req.query.maxPrice || "60");

  if (hotDealsCache.length && now - lastUpdate < CACHE_TTL) {
    return res.status(200).json(hotDealsCache.slice(0, limit));
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
        const filtered = data.data
          .filter(f => f.found_direct && f.price <= maxPrice)
          .map(f => ({
            ...f,
            highlight: f.price < 60, // 🔥 подсветка дешевых
          }));
        results.push(...filtered);
      }
    } catch (err) {
      console.warn("⚠️ Ошибка загрузки маршрута:", route, err);
    }
  }

  // 🔽 Сортировка по цене (возрастание)
  results.sort((a, b) => (a.price || a.value) - (b.price || b.value));

  const top = results.slice(0, limit);
  hotDealsCache = top;
  lastUpdate = now;

  return res.status(200).json(top);
}
