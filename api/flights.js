export default async function handler(req, res) {
   res.setHeader("Access-Control-Allow-Origin", "*"); // или укажи конкретный домен
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight запрос
  }
  const flights = [
    { from: "Kyiv", to: "Warsaw", date: "2025-04-01", price: 79 },
    { from: "Lviv", to: "Berlin", date: "2025-04-03", price: 99 },
    { from: "Odessa", to: "Vienna", date: "2025-04-05", price: 89 }
  ];
  res.status(200).json(flights);
}
