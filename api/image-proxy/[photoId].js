import fetch from "node-fetch";

export default async function handler(req, res) {
  const { photoId } = req.query;

  // Если photoId — массив (из-за вложенного пути), собираем
  const fullPath = Array.isArray(photoId) ? photoId.join("/") : photoId;

  console.log("📸 Запрос на image-proxy. fullPath =", fullPath);

  if (!fullPath) {
    return res.status(400).send("❌ photoId is required");
  }

  try {
    const imageUrl = `https://photo.hotellook.com/image_v2/limit/${fullPath}`;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(response.status).send(`❌ Не удалось получить изображение: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Ошибка прокси:", err.message);
    res.status(500).send("❌ Ошибка сервера при загрузке изображения");
  }
}
