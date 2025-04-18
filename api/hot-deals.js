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

// 👉 Функция генерации массива дат от 14 до 60 дней
function getDepartureDates() {
  const dates = [];
  const now = new Date();
  for (let i = 14; i <= 60; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const now = Date.now();
  if (hotDealsCache.length && now - lastUpdate < CACHE_TTL) {
    return res.status(200).json(hotDealsCache);
  }

  const results = [];
  const dates = getDepartureDates();

  for (const route of popularRoutes) {
    for (const date of dates) {
      const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${route.from}&destination=${route.to}&departure_at=${date}&currency=usd&token=${token}`;
      try {
        const res = await fetch(url);
        const data = await res.json();

        const hot = (data.data || []).filter(f => f.price <= 50);
        results.push(...hot);
      } catch (err) {
        console.warn("⚠️ Ошибка при загрузке:", route, date, err);
      }
    }
  }

  hotDealsCache = results;
  lastUpdate = Date.now();

  return res.status(200).json(results);
}
