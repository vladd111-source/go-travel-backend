import http from "http";
import hotelHandler from './api/hotels.js';
import gptHandler from './api/gpt.js';
import placesHandler from './api/places.js'; // 👈 добавил импорт

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/hotels") {
    hotelHandler(req, res);
  } else if (url.pathname === "/api/gpt") {
    gptHandler(req, res);
  } else if (url.pathname === "/api/places") {
    placesHandler(req, res); // 👈 добавил вызов
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
