import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const query = searchParams.get("query") || "travel";
    const accessKey = "vuhLL00i9Jyvcecx1V9vuj2Pd9P9bJvr3bcJaFRnH0k";

    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${accessKey}`;
    const r = await fetch(apiUrl);
    const data = await r.json();
    const photo = data?.results?.[0];

    console.log("📸 Unsplash photo URL:", photo?.urls?.regular); // 👉 ВОТ СЮДА

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      url: photo?.urls?.regular || "https://placehold.co/300x180?text=No+Image"
    }));
  } catch (e) {
    console.error("Unsplash error:", e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ url: "https://placehold.co/300x180?text=Error" }));
  }
}
