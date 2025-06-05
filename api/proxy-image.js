import fetch from "node-fetch";

export default async function handler(req, res) {
  // ✅ Универсальные CORS-заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.writeHead(204).end();
  }

  // ✅ Извлечение пути
  const match = req.url.match(/\/api\/image-proxy\/(.+)/);
  const photoPath = match?.[1];

  if (!photoPath) {
    return res
      .writeHead(400, { "Content-Type": "text/plain" })
      .end("❌ photoPath is required");
  }

  const imageUrl = `https://photo.hotellook.com/image_v2/limit/${photoPath}`;
  console.log("📸 Проксируем:", imageUrl);

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res
        .writeHead(response.status, { "Content-Type": "text/plain" })
        .end(`❌ Не удалось получить изображение: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return res
      .writeHead(200, { "Content-Type": contentType })
      .end(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Proxy error:", err.message || err);
    return res
      .writeHead(500, { "Content-Type": "text/plain" })
      .end("❌ Proxy failure");
  }
}
