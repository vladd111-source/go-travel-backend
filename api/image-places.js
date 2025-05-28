import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const rawQuery = searchParams.get("query") || "";

    // 🧼 Очищаем и проверяем запрос
    let query = rawQuery.replace(/[^\w\s-]/gi, "").trim();
    if (!query) query = "travel"; // 💡 Подстраховка

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) throw new Error("Missing UNSPLASH_ACCESS_KEY");

    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${accessKey}`;
    console.log("🔍 Запрос к Unsplash:", apiUrl);

    const r = await fetch(apiUrl);
    const data = await r.json().catch(() => null);

    const url = Array.isArray(data?.results) && data.results[0]?.urls?.regular
      ? data.results[0].urls.regular
      : "https://placehold.co/300x180?text=No+Image";

    console.log("📸 Выдано изображение:", url);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ url }));
  } catch (err) {
    console.error("❌ Ошибка запроса к Unsplash:", err.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ url: "https://placehold.co/300x180?text=Error" }));
  }
}
