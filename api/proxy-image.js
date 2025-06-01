import fetch from "node-fetch";

export default async function handler(req, res) {
  const { photoId } = req.query;

  if (!photoId) {
    return res.status(400).send("❌ photoId is required");
  }

  try {
    const imageUrl = `https://photo.hotellook.com/image_v2/limit/${photoId}/800/520.jpg`;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(response.status).send(`❌ Не удалось получить изображение: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=59");

    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Ошибка прокси:", error.message);
    res.status(500).send("❌ Ошибка сервера при загрузке изображения");
  }
}
