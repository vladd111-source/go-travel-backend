// ✅ /api/places
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const places = [
    {
      name: "Бранденбургские ворота",
      city: "Берлин",
      category: "culture",
      description: "Один из самых известных символов Берлина.",
      image: "https://picsum.photos/300/180?random=10"
    },
    {
      name: "Английский сад",
      city: "Мюнхен",
      category: "nature",
      description: "Один из крупнейших городских парков в Европе.",
      image: "https://picsum.photos/300/180?random=11"
    },
    {
      name: "Эйфелева башня",
      city: "Париж",
      category: "culture",
      description: "Знаменитая железная башня и символ Парижа.",
      image: "https://picsum.photos/300/180?random=12"
    }
  ];

  res.status(200).json(places);
}
