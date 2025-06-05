import http from "http";
import hotelHandler from "./api/hotels.js";
import gptHandler from "./api/gpt.js";
import imageHandler from "./api/image-places.js";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const allowedOrigin = "*";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === "/api/hotels") {
      return hotelHandler(req, res);
    }

    if (url.pathname === "/api/gpt") {
      return gptHandler(req, res);
    }

    if (url.pathname === "/api/image") {
      return imageHandler(req, res);
    }

    if (url.pathname.startsWith("/api/image-proxy/")) {
      const proxyHandler = await import("./api/proxy-image.js");
      return proxyHandler.default(req, res);
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  } catch (err) {
    console.error("❌ Server error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "❌ Internal Server Error" }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
