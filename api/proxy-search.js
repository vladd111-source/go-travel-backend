import fetch from "node-fetch";

const proxySearchHandler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    const apiRes = await fetch("https://engine.hotellook.com/api/v2/search/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (error) {
    console.error("❌ Ошибка proxy-search:", error);
    res.status(500).json({ error: "Ошибка при проксировании запроса" });
  }
};

export default proxySearchHandler;
