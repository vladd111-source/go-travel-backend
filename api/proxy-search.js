import fetch from "node-fetch";

const proxySearchHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://go-travel-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    const requiredFields = ["location", "checkIn", "checkOut", "token", "marker"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Отсутствует обязательное поле: ${field}` });
      }
    }

    const apiRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await apiRes.text();
    try {
      const data = JSON.parse(text);
      return res.status(apiRes.status).json(data);
    } catch {
      console.error("❌ Невалидный JSON от API:", text);
      return res.status(502).json({ error: "Невалидный ответ от внешнего API" });
    }

  } catch (error) {
    console.error("❌ Ошибка proxy-search:", error.message || error);
    return res.status(500).json({ error: "Ошибка при проксировании запроса" });
  }
};

export default proxySearchHandler;
