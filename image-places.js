import fetch from "node-fetch";

export default async function handler(req, res) {
  const query = req.url.split("=")[1];
  const accessKey = "vuhLL00i9Jyvcecx1V9vuj2Pd9P9bJvr3bcJaFRnH0k"; // твой ключ

  try {
    const apiUrl = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&client_id=${accessKey}`;
    const r = await fetch(apiUrl);
    const data = await r.json();

    const photo = data.results?.[0];
    res.json({
      url: photo?.urls?.regular || "https://placehold.co/300x180?text=No+Image"
    });
  } catch (e) {
    console.error("Unsplash error:", e);
    res.status(500).json({ url: "https://placehold.co/300x180?text=Error" });
  }
}
