const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function handleGPT(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не разрешён" });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Вопрос не указан" });
  }

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Ты — тревел-ассистент Go Travel. Пиши как местный житель, живо, дружелюбно, давай маршруты, эмоции, советы.",
        },
        { role: "user", content: question },
      ],
      temperature: 0.8,
      max_tokens: 400,
    });

    const reply = chat.choices[0]?.message?.content || "Нет ответа.";
    res.json({ answer: reply });
  } catch (err) {
    console.error("GPT Error:", err);
    res.status(500).json({ error: "Ошибка ChatGPT" });
  }
}

module.exports = handleGPT;
