import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const match = req.url.match(/\/api\/image-proxy\/(.+)/);
  const encodedPath = match?.[1];
  const photoPath = decodeURIComponent(encodedPath || "");

  if (!photoPath) {
    return res.status(400).send("❌ photoPath is required");
  }

  const imageUrl = `https://photo.hotellook.com/image_v2/limit/${photoPath}`;
  console.log("📸 Проксируем:", imageUrl);

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`❌ Не удалось получить изображение: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const buffer = await response.arrayBuffer();
    res.status(200).end(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Proxy error:", err.message);
    res.status(500).send("❌ Proxy failure");
  }
}
