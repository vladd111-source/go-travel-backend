import fetch from "node-fetch";

export default async function handler(req, res) {
  // ✅ Заголовки CORS — устанавливаются сразу
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ✅ Извлечение photoPath из URL
  const match = req.url.match(/\/api\/image-proxy\/(.+)/);
  const photoPath = match?.[1];

  if (!photoPath) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("❌ photoPath is required");
  }

  const imageUrl = `https://photo.hotellook.com/image_v2/limit/${photoPath}`;
  console.log("📸 Проксируем:", imageUrl);

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.writeHead(response.status, { "Content-Type": "text/plain" });
      return res.end(`❌ Не удалось получить изображение: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(200, { "Content-Type": contentType });
    return res.end(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Proxy error:", err.message || err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(500, { "Content-Type": "text/plain" });
    return res.end("❌ Proxy failure");
  }
}
