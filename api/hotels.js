export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://go-travel-frontend.vercel.app'); // 👈 твой фронт
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Authorization, Content-Type');

  // Обрабатываем preflight запрос
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const hotels = [
    { name: "Hilton", city: "Kyiv", price: 120, rating: 4.8 },
    { name: "Premier Palace", city: "Lviv", price: 90, rating: 4.3 },
    { name: "InterContinental", city: "Odessa", price: 140, rating: 4.7 }
  ];

  res.status(200).json(hotels);
}
