// controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

function buildJsonPrompt(userMessage) {
  return `
Você é um agente especializado em automatizar um quadro Kanban.

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
               | "insight-request",
      "title": "nome do card (somente create-card)",
      "description": "descrição detalhada do card (somente create-card)",
      "cardTitle": "nome do card existente (obrigatório para mover, checklist, deletar, atualizar)",
      "priority": "baixa | media | alta | urgente",
      "deadline": "AAAA-MM-DD",
      "assignee": "responsável",
      "labels": ["tag1", "tag2"],
      "columnId": "backlog | doing | done",
      "toColumn": "backlog | doing | done",
      "items": ["item 1", "item 2"] 
    }
  ]
}

Regras:
- Se o usuário pedir para criar um card, use "type": "create-card".
- Para "create-card", sempre gerar também o campo "description".
- A descrição deve ser um texto curto (1 a 3 frases) explicando o objetivo do card,
  criada automaticamente com base no título.
- Caso o usuário escreva uma descrição no pedido, utilize-a. Caso contrário, crie uma.
- Para "create-card", sempre gerar também o campo "labels".
- As labels devem ser criadas automaticamente com base no título do card.
- As labels devem ser palavras curtas que descrevem o tipo da tarefa.
- Exemplos:
  Título: "Criar tela de login"
  Labels: ["frontend", "ui", "login"]

  Título: "Configurar autenticação JWT"
  Labels: ["backend", "auth", "jwt"]

  Título: "Criar deploy automatizado"
  Labels: ["devops", "deploy", "ci/cd"]
- As labels devem vir em formato JSON: ["tag1", "tag2", "tag3"]

- Se pedir para mover um card, use "type": "move-card".
- Se pedir checklist para um card, use "type": "add-checklist".
- Se o usuário NÃO fornecer os itens da checklist, então GERE OS ITENS AUTOMATICAMENTE
  com base no título do card.
- Os itens devem descrever subtarefas lógicas, práticas e coerentes com o título.
- Exemplo:
  Card: "Criar sistema de login"
  items: ["Criar tela de login", "Validar usuário", "Integrar API", "Implementar JWT"]
- Se pedir para apagar/remover/excluir um card, use "type": "delete-card" e preencha "cardTitle" com o nome do card.
- Se pedir para alterar prazo/data/deadline, use "type": "update-deadline" e informe "cardTitle" e "deadline".
- Se o usuário mencionar responsável, pessoa, atribuir ou colocar alguém na tarefa,
  SEMPRE preencha o campo "assignee" com o nome citado.
- Use português nos textos, mas mantenha os campos do JSON exatamente como definidos acima.
- Nunca explique nada, nunca use markdown, nunca coloque texto fora do JSON.
+ Se o usuário pedir para alterar título, use "type": "update-title".
+ Se pedir para alterar descrição, use "type": "update-description".
+ Se pedir para alterar labels/tags, use "type": "update-labels".
+ Para essas ações, sempre preencher "cardTitle" e o campo correspondente:
+   title (novo)
+   description (nova)
+   labels (array)

- update-priority → usa prioridade informada (baixa, média, alta, urgente)
- update-status → altera o status interno do card (backlog, doing, review, done)
- O campo "status" deve sempre usar um destes valores exatos:
  ["backlog", "doing", "review", "done"].

- Para operações em massa, use "type": "bulk-update" ou "bulk-delete".
- Sempre incluir um critério de filtro no campo "where".
- Exemplos válidos de "where":
  { "priority": "urgente" }
  { "assignee": "João" }
  { "status": "doing" }
  { "columnId": "backlog" }
  { "deadlineBefore": "2025-01-10" }
  { "deadlineAfter": "2025-02-01" }
  { "labelContains": "frontend" }
- Para atualizar vários cards:
  {
    "type": "bulk-update",
    "where": {...},
    "set": {...}
  }
- Para deletar vários cards:
  {
    "type": "bulk-delete",
    "where": {...}
  }

- Para obter cards atrasados, use:
  {
    "actions": [
      {
        "type": "insight-request",
        "query": "cards_atrasados"
      }
    ]
  }

- update-estimated-hours → altera o campo estimatedHours do card.
  Campos: cardTitle, estimatedHours (número)

- update-worked-hours → define workedHours como um valor específico.
  Campos: cardTitle, workedHours (número)

- add-worked-hours → soma horas ao workedHours existente.
  Campos: cardTitle, hours (número)



Agora gere as ações para o pedido do usuário abaixo:

"${userMessage}"
`.trim();
}

module.exports = {
  async chat(req, res) {
    try {
      //const { message, jsonMode = false } = req.body;
      const { message } = req.body;
      const jsonMode = true;


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
