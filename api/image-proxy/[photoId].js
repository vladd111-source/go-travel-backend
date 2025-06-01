import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { photoId } = req.query;

  if (!photoId || typeof photoId !== "string") {
    return res.status(400).send("❌ photoId is required");
  }

  try {
    const decoded = Buffer.from(photoId, "base64").toString("utf8");
    const imageUrl = `https://photo.hotellook.com/image_v2/limit/${decoded}`;
    console.log("📸 imageUrl:", imageUrl);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).send(`❌ Ошибка получения: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Ошибка прокси:", err.message);
    res.status(500).send("❌ Ошибка проксирования изображения");
  }
}
