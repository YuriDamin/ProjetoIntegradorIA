// controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Card } = require("../models");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiActions = require("../ai/aiActions");

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

function buildJsonPrompt(userMessage, today, activeCards) {
  return `
Você é um agente especializado em automatizar um quadro Kanban.
Hoje é: ${today}
Cartões existentes no quadro: [${activeCards}]

Sempre responda APENAS um JSON válido, SEM texto extra e SEM markdown.

O formato SEMPRE deve ser:

{
  "actions": [
   {
        "type": "create-card" | "move-card" | "add-checklist" |
               "delete-card" | "update-deadline" | "update-assignee" |
               "update-description" | "update-title" | "update-labels"|
               "update-estimated-hours" | "update-worked-hours" | "add-worked-hours" |
               "update-priority" | "update-status" | "bulk-update" | "bulk-delete" 
               | "insight-request" | "chat-response",
      "title": "nome do card (somente create-card)",
      "description": "descrição detalhada do card (somente create-card)",
      "cardTitle": "nome do card existente (obrigatório para mover, checklist, deletar, atualizar)",
      "priority": "baixa | media | alta | urgente",
      "deadline": "AAAA-MM-DD",
      "assignee": "responsável",
      "labels": ["tag1", "tag2"],
      "columnId": "backlog | doing | done",
      "toColumn": "backlog | doing | done",
      "items": ["item 1", "item 2"],
      "message": "Texto do conselho ou resposta (somente chat-response)"
    }
  ]
}

Regras:
- Se o usuário pedir para criar um card, use "type": "create-card".
  - IMPORTANTE: Antes de criar, VERIFIQUE a lista de "Cartões existentes".
  - Se já existir um cartão com nome MUITO similar e o usuário estiver adicionando detalhes ou checklist,
    use "add-checklist" ou "update-description" nesse cartão existente em vez de criar um novo.
  - Exemplo: Se existe "Ir ao mercado" e usuário diz "comprar suco no mercado", gere "add-checklist" para "Ir ao mercado".

- Datas relativas:
  - Se o usuário disser "amanhã", calcule a data com base em ${today}.
  - Se disser "próxima sexta", calcule a data correta.
  - Formato de data sempre: AAAA-MM-DD.

- Para "create-card", sempre gerar também o campo "description" e "labels" (baseado no título).
- Labels devem ser JSON array de strings: ["tag1", "tag2"].

- Se pedir checklist para um card, use "type": "add-checklist".
- Se o usuário NÃO fornecer os itens da checklist, gere itens lógicos automaticamente. (Ex: "Fazer bolo" -> ["Comprar farinha", "Ovos", "Assar"]).

- create-card:
  - Gere DUAS ações se for criar E adicionar itens:
    1. "create-card"
    2. "add-checklist" (use o MESMO título).

- Se pedir para apagar/remover/excluir, use "type": "delete-card".
- Se pedir para alterar prazo/data/deadline, use "type": "update-deadline".
- Se mencionar responsável/atribuir, use "assignee".

- "insight-request":
  - "cards_atrasados" -> para atrasados.
  - "burndown" -> para burndown.
  - "cards_hoje" -> para tarefas de hoje.

- "chat-response":
  - Use isso se o usuário pedir um conselho, resumo, ajuda de organização, ou conversar.
  - O campo "message" deve conter a resposta útil e amigável.
  - Exemplo: Usuário "Me ajude a organizar meu dia". Ação: type: "chat-response", message: "Claro! Foque nas tarefas urgentes..."

- IMPORTANTE: Se o usuário disser que "já fez", "terminou", use "update-status" -> "done".

Agora gere as ações para o pedido do usuário abaixo:

"${userMessage}"
`.trim();
}

module.exports = {
  async chat(req, res) {
    try {
      const { message } = req.body;
      const jsonMode = true;


      if (!message) {
        return res.status(400).json({ error: "message é obrigatório" });
      }

      // 1. Obter contexto (Data e Cards)
      const today = new Date().toISOString().split("T")[0];
      const allCards = await Card.findAll({
        attributes: ["title"],
        // Podemos filtrar por status se quiser ignorar done, mas para evitar duplicação geral, melhor pegar tudo ou exceto done.
        // Vamos pegar tudo para garantir.
      });
      const cardTitles = allCards.map((c) => c.title).join(", ");

      const baseModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        ...(jsonMode && {
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      const prompt = jsonMode
        ? buildJsonPrompt(message, today, cardTitles)
        : message;


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
        console.log("EXEC RESULT >>>", execResult);

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
