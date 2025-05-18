import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Метод не разрешён" }));
    return;
  }

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    try {
      const { question } = JSON.parse(body);
      if (!question) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Вопрос не указан" }));
        return;
      }

      const chat = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Ты — тревел-ассистент Go Travel. Пиши живо, как местный житель. Давай советы, эмоции, короткие маршруты."
          },
          { role: "user", content: question }
        ],
        temperature: 0.8,
        max_tokens: 400
      });

      const answer = chat.choices[0]?.message?.content || "Нет ответа.";

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ answer }));
    } catch (err) {
      console.error("GPT Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Ошибка ChatGPT" }));
    }
  });
}
