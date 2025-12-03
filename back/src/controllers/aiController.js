// controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiActions = require("../ai/aiActions");

// extrai JSON do resultado do Gemini
function extractJSON(result) {
  try {
    const text =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return null;

    const cleaned = text
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

function buildJsonPrompt(userMessage) {
  return `
Você é um agente especializado em automatizar um quadro Kanban.

Sempre responda APENAS um JSON válido, SEM texto extra e SEM markdown.

O formato SEMPRE deve ser:

{
  "actions": [
    {
      "type": "create-card" | "move-card" | "add-checklist" | "delete-card" | "update-deadline" | "update-assignee",
      "title": "string opcional (nome do card)",
      "priority": "baixa|média|alta",
      "deadline": "AAAA-MM-DD",
      "assignee": "nome da pessoa",
      "labels": ["tag1", "tag2"],
      "columnId": "backlog|doing|done",
      "cardTitle": "string (para localizar o card)",
      "toColumn": "backlog|doing|done",
      "items": ["texto do item 1", "texto do item 2"]
    }
  ]
}

Regras:
- Se o usuário pedir para criar um card, use "type": "create-card".
- Se pedir para mover um card, use "type": "move-card".
- Se pedir checklist para um card, use "type": "add-checklist" com a lista em "items".
- Se pedir para apagar/remover/excluir um card, use "type": "delete-card" e preencha "cardTitle" com o nome do card.
- Se pedir para alterar prazo/data/deadline, use "type": "update-deadline" e informe "cardTitle" e "deadline".
- Se o usuário mencionar responsável, pessoa, atribuir ou colocar alguém na tarefa,
  SEMPRE preencha o campo "assignee" com o nome citado.
- Use português nos textos, mas mantenha os campos do JSON exatamente como definidos acima.
- Nunca explique nada, nunca use markdown, nunca coloque texto fora do JSON.

Agora gere as ações para o pedido do usuário abaixo:

"${userMessage}"
`.trim();
}

module.exports = {
  async chat(req, res) {
    try {
      const { message, jsonMode = false } = req.body;

      if (!message) {
        return res.status(400).json({ error: "message é obrigatório" });
      }

      const baseModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        ...(jsonMode && {
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      const prompt = jsonMode ? buildJsonPrompt(message) : message;


      const result = await baseModel.generateContent(prompt);

      if (jsonMode) {
        const json = extractJSON(result);

        if (!json || !Array.isArray(json.actions)) {
          return res.json({
            reply: null,
            raw:
              result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
              JSON.stringify(result, null, 2),
            warning: "JSON inválido retornado pelo Gemini.",
          });
        }

        const execResult = await aiActions.executeActions(json.actions);

        const io = req.app.get("io");
        if (io) {
          io.emit("board-updated");
        }

        return res.json({ reply: { actions: execResult } });
      }

      const text = result.response.text();
      return res.json({ reply: text });

    } catch (err) {
      console.error("IA ERROR:", err);
      return res.status(500).json({
        error: "Erro ao comunicar com a IA",
        details: err?.message,
      });
    }
  },
};
