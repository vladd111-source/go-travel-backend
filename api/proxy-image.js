import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { photoId } = req.query;
  
  console.log("📸 Запрос на image-proxy. photoId =", photoId); // 👈 Добавь сюда
  
  if (!photoId) {
    return res.status(400).send("❌ photoId is required");
  }

  try {
    // 💡 Здесь photoId — это всё после `/limit/`
  const imageUrl = photoId.includes("/")
  ? `https://photo.hotellook.com/image_v2/limit/${photoId}`
  : `https://photo.hotellook.com/image_v2/limit/${photoId}/800/520.jpg`;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(response.status).send(`❌ Не удалось получить изображение: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Ошибка прокси:", error.message);
    res.status(500).send("❌ Ошибка сервера при загрузке изображения");
  }
}
