export default async function handler(req, res) {
  const hotels = [
    { name: "Hilton", city: "Kyiv", price: 120, rating: 4.8 },
    { name: "Premier Palace", city: "Lviv", price: 90, rating: 4.3 },
    { name: "InterContinental", city: "Odessa", price: 140, rating: 4.7 }
  ];
  res.status(200).json(hotels);
}
