import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const RATE_LIMIT_MS = 10 * 1000;
const userTimestamps = new Map();

export default async function handler(req, res) {
  // ✅ CORS-заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Обработка preflight-запроса
  if (req.method === "OPTIONS") {
    return res.writeHead(200).end();
  }

  // ❌ Только POST-запросы
  if (req.method !== "POST") {
    return res.writeHead(405, { "Content-Type": "application/json" })
              .end(JSON.stringify({ error: "Метод не разрешён" }));
  }

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    try {
      const { question, telegramId, mode } = JSON.parse(body);

      if (!question || !telegramId) {
        return res.writeHead(400, { "Content-Type": "application/json" })
                  .end(JSON.stringify({ error: "Вопрос или telegramId не указан" }));
      }

      const now = Date.now();
      const last = userTimestamps.get(telegramId) || 0;
      if (now - last < RATE_LIMIT_MS) {
        return res.writeHead(429, { "Content-Type": "application/json" })
                  .end(JSON.stringify({ error: "Слишком часто. Подожди пару секунд." }));
      }
      userTimestamps.set(telegramId, now);

      const selectedModel = mode === "pro" ? "gpt-4" : "gpt-3.5-turbo";

      const chat = await openai.chat.completions.create({
        model: selectedModel,
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
        model: selectedModel,
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
