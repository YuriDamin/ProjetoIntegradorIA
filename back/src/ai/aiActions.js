// src/ai/aiActions.js
const { Card, Checklist, Column } = require("../models");

// ======================================================================
// PRIORIDADE — normalização completa
// ======================================================================
function mapPriority(str = "") {
  const p = String(str).toLowerCase();

  if (p.includes("urg")) return "urgente";
  if (p.includes("alt") || p.includes("high")) return "alta";
  if (p.includes("med") || p.includes("méd") || p.includes("medium")) return "media";
  if (p.includes("baix") || p.includes("low")) return "baixa";

  return "media"; // fallback seguro
}

// ======================================================================
// COLUNA — normalização completa
// ======================================================================
function mapColumn(str = "") {
  const c = String(str).toLowerCase();

  if (c.includes("backlog")) return "backlog";
  if (c.includes("andamento") || c.includes("doing")) return "doing";
  if (c.includes("concluído") || c.includes("concluido") || c.includes("done")) return "done";

  return "backlog"; // fallback seguro
}

module.exports = {
  /**
   * actions: array no formato:
   * {
   *   type: "create-card" | "move-card" | "add-checklist",
   *   title: string,
   *   priority: string,
   *   columnId: string,
   *   cardTitle: string,
   *   toColumn: string,
   *   items: string[]
   * }
   */

  async executeActions(actions = []) {
    const results = [];

    for (const action of actions) {
      try {
        // ======================================================================
        // 1. CRIAR CARD
        // ======================================================================
        if (action.type === "create-card") {
          const title =
            action.title ||
            action.name ||
            action.nome ||
            "Nova tarefa";

          const priority = mapPriority(action.priority || action.prioridade);
          const columnId = action.columnId || mapColumn(action.column || action.localizacao);

          // Criar card COMPLETO — nunca nulo
          const newCard = await Card.create({
            title,
            description: "",
            priority,
            columnId,
            status: columnId,
            deadline: null,
            estimatedHours: null,
            workedHours: 0,
            assignee: null,
            labels: [],
          });

          results.push({
            ok: true,
            type: "create-card",
            id: newCard.id,
            title,
            priority,
            columnId,
          });

          continue;
        }

        // ======================================================================
        // 2. MOVER CARD
        // ======================================================================
        if (action.type === "move-card") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const toColumn = mapColumn(
            action.toColumn ||
            action.targetColumn ||
            action.localizacao
          );

          const card = await Card.findOne({ where: { title: cardTitle } });
          if (!card) {
            results.push({
              ok: false,
              type: "move-card",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          await card.update({
            columnId: toColumn,
            status: toColumn,
          });

          results.push({
            ok: true,
            type: "move-card",
            cardTitle,
            toColumn,
          });

          continue;
        }

        // ======================================================================
        // 3. ADICIONAR CHECKLIST
        // ======================================================================
        if (action.type === "add-checklist") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const items = action.items || action.checklist || [];

          const card = await Card.findOne({ where: { title: cardTitle } });
          if (!card) {
            results.push({
              ok: false,
              type: "add-checklist",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          // Criar cada item da checklist
          for (const text of items) {
            if (!text) continue;

            await Checklist.create({
              text: String(text),
              done: false,
              cardId: card.id,
            });
          }

          results.push({
            ok: true,
            type: "add-checklist",
            cardTitle,
            itemsCount: items.length,
          });

          continue;
        }

        // ======================================================================
        // AÇÃO DESCONHECIDA
        // ======================================================================
        results.push({
          ok: false,
          type: action.type,
          error: "Ação desconhecida",
        });

      } catch (err) {
        results.push({
          ok: false,
          type: action.type,
          error: err.message,
        });
      }
    }

    return results;
  },
};
