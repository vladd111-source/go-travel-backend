import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const RATE_LIMIT_MS = 10 * 1000;
const userTimestamps = new Map();

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
      const { question, telegramId } = JSON.parse(body);

      if (!question || !telegramId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Вопрос или telegramId не указан" }));
        return;
      }

      const now = Date.now();
      const last = userTimestamps.get(telegramId) || 0;
      if (now - last < RATE_LIMIT_MS) {
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Слишком часто. Подожди пару секунд." }));
        return;
      }
      userTimestamps.set(telegramId, now);

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

      // лог в Supabase
      await supabase.from("gpt_logs").insert({
        telegram_id: telegramId,
        question,
        answer,
        timestamp: new Date().toISOString()
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ answer }));
    } catch (err) {
      console.error("GPT Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Ошибка ChatGPT" }));
    }
  });
}
