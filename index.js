import http from "http";
import hotelHandler from './api/hotels.js';
import gptHandler from './api/gpt.js';
import imageHandler from "./api/image-places.js";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ✅ Установка CORS-заголовков
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Обработка preflight (OPTIONS-запросов)
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // ✅ Основная маршрутизация
  if (url.pathname === "/api/hotels") {
    hotelHandler(req, res);
  } else if (url.pathname === "/api/gpt") {
    gptHandler(req, res);
  } else if (url.pathname === "/api/image") {
    imageHandler(req, res);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
