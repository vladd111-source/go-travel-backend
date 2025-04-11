export default async function handler(req, res) {
  // ✅ CORS headers
res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Preflight check
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Проверка query-параметров
  const { from, to, date } = req.query;
  if (!from || !to || !date) {
    return res.status(400).json({ error: "Missing required query parameters: from, to, date" });
  }

  // ✅ URL запроса к TravelPayouts
  const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${from}&destination=${to}&departure_at=${date}&currency=usd&token=067df6a5f1de28c8a898bc83744dfdcd`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Возвращаем только массив рейсов
    return res.status(200).json(data.data || []);
  } catch (err) {
    console.error("❌ Ошибка при запросе к Aviasales API:", err);
    return res.status(500).json({ error: "Ошибка при получении рейсов" });
  }
}
