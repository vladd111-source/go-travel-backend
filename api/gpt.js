import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

// 🔐 Init API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🔁 Чтение тела запроса
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const allowedOrigin = "https://go-travel-frontend.vercel.app";

  // 🔐 CORS headers для всех случаев
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  // 🔁 Preflight check
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ❌ Только POST разрешён
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Метод не разрешён" }));
    return;
  }

  try {
    const raw = await readBody(req);
    console.log("📦 RAW BODY:", raw);

    if (!raw?.trim()) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Пустое тело запроса" }));
      return;
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Невалидный JSON" }));
      return;
    }

    const { question, telegramId, mode } = payload;
    console.log("🧠 GPT INPUT:", { question, telegramId, mode });

    if (!question || !telegramId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Вопрос или telegramId не указан" }));
      return;
    }

    // 🔁 GPT model selection
    const selectedModel = mode === "pro" ? "gpt-4" : "gpt-3.5-turbo";

    // 🔮 Запрос в OpenAI
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

    console.log("📬 Ответ GPT:", answer);

    // 📝 Логирование в Supabase
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
    console.error("🔥 GPT Ошибка:", err?.response?.data || err?.stack || err?.message || err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Ошибка ChatGPT" }));
  }
}
