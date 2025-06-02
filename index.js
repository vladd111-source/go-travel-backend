import http from "http";
import hotelHandler from './api/hotels.js';
import gptHandler from './api/gpt.js';
import imageHandler from "./api/image-places.js";

const server = http.createServer((req, res) => {
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

  if (url.pathname === "/api/hotels") {
    hotelHandler(req, res);
  } else if (url.pathname === "/api/gpt") {
    gptHandler(req, res);
  } else if (url.pathname === "/api/image") {
    imageHandler(req, res);
  } else if (url.pathname.startsWith("/api/image-proxy/")) {
    import('./api/proxy-image.js').then((proxyHandler) => {
      proxyHandler.default(req, res);
    }).catch((err) => {
      console.error("❌ Ошибка импорта proxy-image:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("❌ Internal server error");
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
