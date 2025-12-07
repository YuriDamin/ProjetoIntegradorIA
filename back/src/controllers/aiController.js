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

function buildJsonPrompt(userMessage, today, activeCards, history = []) {
  const historyText = history.map(msg => `${msg.from}: ${msg.text}`).join("\n");
  return `
Você é um agente especializado em automatizar um quadro Kanban.
Hoje é: ${today}
Cartões existentes no quadro: [${activeCards}]
Histórico recente:
${historyText}

Sempre responda APENAS um JSON válido, SEM texto extra e SEM markdown.

O formato SEMPRE deve ser:

{
  "actions": [
   {
        "type": "create-card" | "move-card" | "add-checklist" |
               "delete-card" | "update-deadline" | "update-assignee" |
               "update-description" | "update-title" | "update-labels"|
               "update-estimated-hours" | "update-worked-hours" | "add-worked-hours" |
// ...
// Inside buildJsonPrompt:

               "update-priority" | "update-status" | "bulk-update" | "bulk-delete" 
               | "insight-request" | "chat-response" | "update-checklist-item",
      "title": "nome do card (somente create-card)",
      "description": "descrição detalhada do card (somente create-card)",
      "status": "backlog | doing | done", // para update-status
      "cardTitle": "nome do card existente (obrigatório para actions de update)",
      "itemTitle": "texto do item da checklist (para update-checklist-item)",
      "isDone": true | false, // para update-checklist-item
      "query": "cards_hoje | cards_atrasados | burndown", 
      "priority": "baixa | media | alta | urgente",
      "deadline": "AAAA-MM-DD",
// ...
// Regras:
// ...
- Datas relativas:
  - Se o usuário disser "amanhã", OBRIGATORIAMENTE calcule a data com base em ${today} e preencha o campo "deadline".
  - Se disser "próxima sexta", calcule a data correta.
  - Nunca deixe "deadline" vazio se houver menção temporal.
// ...
// Checklist Items:
- Se o usuário pedir para marcar um ITEM (não o card) como concluído/feito (ex: "já comprei o suco"), use "type": "update-checklist-item".
  - Preencha "cardTitle" com o nome do card (infira pelo contexto, ex: "Ir ao mercado").
  - Preencha "itemTitle" com o nome do item (ex: "Suco").
  - Preencha "isDone": true.

- Para "create-card", sempre gerar também o campo "description" e "labels" (baseado no título).
- Labels devem ser JSON array de strings: ["tag1", "tag2"].

- Se pedir checklist para um card, use "type": "add-checklist".
- Se o usuário NÃO fornecer os itens da checklist, gere itens lógicos automaticamente. (Ex: "Fazer bolo" -> ["Comprar farinha", "Ovos", "Assar"]).

- create-card:
  - Gere DUAS ações se for criar E adicionar itens:
    1. "create-card"
    2. "add-checklist" (use o MESMO título).

- SEGURANÇA (Ações Destrutivas ou em Massa):
  - Se o usuário pedir para:
    1. Apagar/Excluir tarefa ("delete-card")
    2. Alterar TODAS as tarefas ("bulk-update")
  - VERIFICAÇÃO OBRIGATÓRIA:
    - O usuário confirmou EXPLICITAMENTE na última mensagem? (ex: "sim", "confirmo", "pode fazer").
    - Se NÃO houver confirmação CLARA recentemente:
      - Gere APENAS "chat-response" com: "Tem certeza que deseja [ação]? Responda 'Sim' para confirmar."
      - NÃO gere a ação de delete ou update ainda.
    - Se HOUVER confirmação:
      - Gere a ação correspondente.

- "bulk-update":
  - Use quando o usuário quiser alterar "todas", "tudo", "os cards".
  - Estrutura: { "type": "bulk-update", "updates": { "deadline": "YYYY-MM-DD", "priority": "Alta" } }
  - NÃO use para 1 card específico. Use os updates específicos nesse caso.
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

EXEMPLOS DE USO:
1. Usuário: "Comprar leite amanhã"
   Ação: { "type": "create-card", "title": "Comprar leite", "deadline": "2024-XX-XX" (data calculada) }

2. Usuário: "Quantas tarefas tenho hoje?"
   Ação: { "type": "insight-request", "query": "cards_hoje" }

3. Usuário: "Já comprei o suco" (supondo que "Suco" seja um item de checklist no card "Mercado")
   Ação: { "type": "update-checklist-item", "cardTitle": "Mercado", "itemTitle": "Suco", "isDone": true }

4. Usuário: "O projeto acabou"
   Ação: { "type": "update-status", "cardTitle": "Projeto", "newStatus": "done" }

Agora gere as ações para o pedido do usuário abaixo:

"${userMessage}"
`.trim();
}

module.exports = {
  async chat(req, res) {
    try {
      const { message, history } = req.body;
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
        ? buildJsonPrompt(message, today, cardTitles, history)
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
