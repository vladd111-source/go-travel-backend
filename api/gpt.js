import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const RATE_LIMIT_MS = 10 * 1000;
const userTimestamps = new Map();

export default async function handler(req, res) {
  const allowedOrigin = "https://go-travel-frontend.vercel.app";

  // ✅ Preflight (OPTIONS) — сразу отдаем все заголовки
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  // ❌ Только POST
  if (req.method !== "POST") {
    res.writeHead(405, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Content-Type": "application/json"
    });
    res.end(JSON.stringify({ error: "Метод не разрешён" }));
    return;
  }

  // ✅ Для POST добавляем CORS
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Content-Type", "application/json");

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    try {
      const { question, telegramId, mode } = JSON.parse(body);

      if (!question || !telegramId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Вопрос или telegramId не указан" }));
        return;
      }

      const now = Date.now();
      const last = userTimestamps.get(telegramId) || 0;
      if (now - last < RATE_LIMIT_MS) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "Слишком часто. Подожди пару секунд." }));
        return;
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

      await supabase.from("gpt_logs").insert({
        telegram_id: telegramId,
        question,
        answer,
        model: selectedModel,
        timestamp: new Date().toISOString()
      });

      res.writeHead(200);
      res.end(JSON.stringify({ answer }));
    } catch (err) {
      console.error("🔥 GPT Error:", err.stack || err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Ошибка ChatGPT" }));
    }
  });
}
