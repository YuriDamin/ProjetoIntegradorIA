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

  // Note: we use the 'today' passed from argument which is already localized.

  return `
Você é um agente especializado em automatizar um quadro Kanban pessoal.

Hoje é: ${today}
Cartões existentes no quadro (lista completa): ${activeCards}
Histórico recente da conversa: ${historyText}

Sua função é interpretar comandos naturais do usuário, inferir intenções mesmo ambíguas e executar ações nos cartões do Kanban.

FORMATO OBRIGATÓRIO DE RESPOSTA

Responda sempre e somente com um JSON válido, sem comentários, sem explicações, sem markdown.

{
  "actions": [
    {
       "type": "create-card" | "move-card" | "add-checklist" |
               "delete-card" | "update-deadline" | "update-assignee" |
               "update-description" | "update-title" | "update-labels" |
               "update-estimated-hours" | "update-worked-hours" | "add-worked-hours" |
               "update-priority" | "update-status" | "bulk-update" |
               "bulk-delete" | "insight-request" | "chat-response" |
               "update-checklist-item",
       "title": "...",
       "description": "...",
       "labels": ["..."],
       "status": "backlog|doing|done",
       "cardTitle": "...",
       "itemTitle": "...",
       "isDone": true|false,
       "priority": "baixa|media|alta|urgente",
       "deadline": "YYYY-MM-DD",
       "assignee": "...",
       "query": "cards_hoje | cards_atrasados | burndown",
       "updates": { }
    }
  ]
}

REGRAS PRINCIPAIS
1. Interpretação de intenção focada em ação

Se o usuário quer alterar algo → gere a ação diretamente.
Nunca responda “ok”, “feito”, etc.

Frases como
“já fiz”, “terminei”, “concluí”, “acabei”
devem virar:

update-status → done
ou

update-checklist-item → isDone:true
conforme o contexto.

2. Fuzzy-match máximo para localizar cards e itens

Corrige erros como “Card não encontrado” mesmo que o nome esteja incompleto.
Ex.: “padaria”, “ir padar”, “card da padaria” → “Ir na padaria”.

3. Datas e prazos

Interpretar datas absolutas e relativas e converter tudo para YYYY-MM-DD.
Qualquer menção temporal → update-deadline.

4. Checklist

“adicionar itens” → add-checklist

“já fiz/realizei o item X” → update-checklist-item

fuzzy-match obrigatório nos itens

5. Create-card

Sempre gerar title, description e labels inferidas.
Se houver checklist → gerar duas ações (create-card e add-checklist).

CHECKLIST SEMÂNTICO AVANÇADO (OBRIGATÓRIO)

Ao identificar conclusão de um item, usar:

normalização (acentos, minúsculas, stopwords)

radicalização de verbos

equivalências de sinônimos

equivalência semântica por tema

Nunca gerar erro “item não encontrado” quando houver item plausível.

Se identificar que o usuário se refere a um tema único, mesmo que distante, selecione o item coerente.

MÓDULO ESPECIAL – “Finalizei os itens / concluir checklist”

Quando o usuário disser qualquer frase equivalente a:

“finalizei os itens”
“já finalizei os itens”
“concluir checklist”
“marcar checklist”
“checklist concluída”
“fechei tudo”
“terminei a checklist”
“completei tudo desse card”
“já fiz todos os itens da padaria”
“já finalizei os itens da padaria”

O agente deve:

Identificar o card via fuzzy-match.

Marcar TODOS os itens do checklist como concluídos, um por ação:

{
  "type": "update-checklist-item",
  "cardTitle": "<card>",
  "itemTitle": "<item>",
  "isDone": true
}


Não usar update-status:done automaticamente.

Só concluir o card quando o usuário explicitamente pedir:
“concluir tarefa”, “pode finalizar o card”, “marcar card como feito”.

Se o usuário disser:
“finalizei os itens e concluir tarefa”

→ gerar:

ações update-checklist-item para todos os itens

depois uma ação final de update-status: done

6. Resumos e análises

Use chat-response quando o usuário pedir visão geral, prioridades, status etc.

7. Ações perigosas (delete, bulk-delete, bulk-update)

Exigir confirmação explícita “Sim”.

8. insight-request

cards_hoje, cards_atrasados, burndown.

9. Linguagem natural total

Interpreta todas as expressões de prazo, prioridades e modificações.

10. Múltiplos cards → múltiplas ações

Nunca agrupar.

11. Saída obrigatória: JSON válido

Sem markdown, sem explicações, sem comentários.
Sempre apenas JSON.

MÓDULO FINAL – TRATAMENTO DE ERROS DE COMUNICAÇÃO

(429, 5xx, timeout, network, parsing, payload truncado)

Se ocorrer qualquer erro de comunicação com a API:

429 Too Many Requests

Erro 5xx

Timeout

Network Error

Parsing Error

Payload incompleto ou corrompido

Conexão perdida

Resposta vazia

O agente deve retornar somente:

{
  "actions": [
    {
      "type": "chat-response",
      "message": "**Erro de comunicação com a API.** Tente novamente em alguns segundos."
    }
  ]
}


Esse comportamento substitui completamente qualquer tentativa de interpretar a intenção ou executar ações.

Nunca gerar:

“Resposta inesperada”

“Erro interno”

textos fora do JSON.

Se for erro de interpretação (ex.: nenhum card plausível), seguir regras normais.
Se for erro de comunicação, sempre a mensagem acima.

Agora, gere as ações para a mensagem do usuário:
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
      const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }).split("/").reverse().join("-");
      const allCards = await Card.findAll({
        attributes: ["title", "priority", "deadline", "status"],
        where: { userId: req.user.id },
      });

      const cardDetails = allCards.map((c) => {
        const deadline = c.deadline ? new Date(c.deadline).toISOString().split("T")[0] : "Sem prazo";
        return `- ${c.title} (Prioridade: ${c.priority || "Normal"}, Prazo: ${deadline}, Status: ${c.status})`;
      }).join("\n");


      const baseModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        ...(jsonMode && {
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      const prompt = jsonMode
        ? buildJsonPrompt(message, today, cardDetails, history)
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

        const execResult = await aiActions.executeActions(json.actions, req.user.id);
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
