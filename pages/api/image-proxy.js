import fetch from "node-fetch";

export default async function handler(req, res) {
  const path = req.url.split("/api/image-proxy/")[1];

  if (!path) {
    return res.status(400).send("❌ path is required");
  }

  const imageUrl = `https://photo.hotellook.com/image_v2/limit/${path}`;
  console.log("📸 Proxying to:", imageUrl);

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`❌ Failed to fetch: ${response.statusText}`);
    }

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Proxy error:", err.message);
    res.status(500).send("❌ Proxy failure");
  }
}
