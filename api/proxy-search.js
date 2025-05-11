import fetch from "node-fetch";

const proxySearchHandler = async (req, res) => {
  // ✅ CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    const hotellookRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const rawText = await hotellookRes.text();
    console.log("📦 Ответ от HotelLook (text):", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error("❌ Невалидный JSON от HotelLook:", jsonErr);
      return res.status(502).json({ error: "Ответ от API не является валидным JSON" });
    }

    return res.status(hotellookRes.status).json(data);
  } catch (error) {
    console.error("❌ Ошибка proxy-search:", error);
    return res.status(500).json({ error: "Ошибка при проксировании запроса" });
  }
};

export default proxySearchHandler;
