import fetch from "node-fetch";
console.log("🔐 ENV UNSPLASH:", process.env.UNSPLASH_ACCESS_KEY);
console.log("🧩 Все ENV:", process.env);

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const rawQuery = searchParams.get("query") || "travel";

    // 🧼 Очищаем запрос
    const query = rawQuery.replace(/[^\w\s-]/gi, "").trim();

    // 🔐 Используем .env ключ
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new Error("UNSPLASH_ACCESS_KEY is missing in environment variables");
    }

    const apiUrl = https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${accessKey};
    console.log("🔍 Запрос к Unsplash:", apiUrl);

    const r = await fetch(apiUrl);
    const data = await r.json();

    if (!r.ok) {
      console.warn("❌ Ошибка ответа от Unsplash:", r.status, data);
      throw new Error("Unsplash API responded with error");
    }

    const photo = data?.results?.[0];
    const url = photo?.urls?.regular;

    console.log("📸 Найдено фото:", url || "❌ нет");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      url: url || "https://placehold.co/300x180?text=No+Image"
    }));
  } catch (e) {
    console.error("❌ Ошибка загрузки с Unsplash:", e.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ url: "https://placehold.co/300x180?text=Error" }));
  }
}
