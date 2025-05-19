export default async function handler(req, res) {
  // ✅ CORS-заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const places = [
    { name: "Бранденбургские ворота", city: "Берлин", description: "Один из самых известных символов Берлина." },
    { name: "Английский сад", city: "Мюнхен", description: "Один из крупнейших городских парков в Европе." },
    { name: "Эйфелева башня", city: "Париж", description: "Знаменитая железная башня и символ Парижа." }
  ];

  res.status(200).json(places);
}
