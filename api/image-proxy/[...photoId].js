import fetch from "node-fetch";

export default async function handler(req, res) {
  const { photoId } = req.query;
  const path = Array.isArray(photoId) ? photoId.join("/") : photoId;

  if (!path) {
    return res.status(400).send("❌ photoId is required");
  }

  const imageUrl = `https://photo.hotellook.com/image_v2/limit/${path}`;
  console.log("📸 Proxy to:", imageUrl);

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).send(`❌ Failed to fetch: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Proxy error:", error.message);
    res.status(500).send("❌ Proxy internal error");
  }
}
