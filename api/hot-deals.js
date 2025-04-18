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
  if (hotDealsCache.length && now - lastUpdate < CACHE_TTL) {
    return res.status(200).json(hotDealsCache);
  }

  const date = new Date();
  const departure = date.toISOString().split("T")[0];

  const results = [];

  for (const route of popularRoutes) {
    const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${route.from}&destination=${route.to}&departure_at=${departure}&currency=usd&token=${token}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();

      const hot = (data.data || []).filter(f => f.price <= 50);
      results.push(...hot);
    } catch (err) {
      console.warn("⚠️ Ошибка при загрузке направления:", route, err);
    }
  }

  hotDealsCache = results;
  lastUpdate = Date.now();

  return res.status(200).json(results);
}
