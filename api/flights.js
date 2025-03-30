export default async function handler(req, res) {
  const flights = [
    { from: "Kyiv", to: "Warsaw", date: "2025-04-01", price: 79 },
    { from: "Lviv", to: "Berlin", date: "2025-04-03", price: 99 },
    { from: "Odessa", to: "Vienna", date: "2025-04-05", price: 89 }
  ];
  res.status(200).json(flights);
}
