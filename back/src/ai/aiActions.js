const { Card, Checklist, Column } = require("../models");
const { Op } = require("sequelize");

function mapPriority(str = "") {
  const p = String(str).toLowerCase();

  if (p.includes("urg")) return "urgente";
  if (p.includes("alt") || p.includes("high")) return "alta";
  if (p.includes("med") || p.includes("méd") || p.includes("medium")) return "media";
  if (p.includes("baix") || p.includes("low")) return "baixa";

  return "media";
}


function mapColumn(str = "") {
  const c = String(str).toLowerCase();

  if (c.includes("backlog")) return "backlog";
  if (c.includes("andamento") || c.includes("doing")) return "doing";
  if (c.includes("concluído") || c.includes("concluido") || c.includes("done")) return "done";

  return "backlog";
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

    // Helper para buscar card case-insensitive (Postgres/Sequelize)
    // Se o banco for Postgres, Op.iLike funciona. Se for SQLite, LIKE pode ser case-insensitive por padrão ou precisa de setup.
    // Vamos assumir Postgres dado o contexto, mas se falhar, podemos ajustar.
    async function findCard(title) {
      if (!title) return null;

      // Tenta exato primeiro (performance)
      let card = await Card.findOne({ where: { title } });
      if (card) return card;

      // Tenta insensível a caixa
      // Op.iLike é específico do Postgres. Se der erro em outro DB, cairá no catch do loop.
      try {
        return await Card.findOne({
          where: {
            title: { [Op.iLike]: title }
          }
        });
      } catch (e) {
        // Fallback se Op.iLike não suportado (ex: SQLite sem extensão)
        // Tenta buscar TODOS e filtrar no JS (lento, mas funcional para poucos cards)
        // Ou tentar Op.like
        return await Card.findOne({
          where: {
            title: { [Op.like]: title }
          }
        })
      }
    }

    for (const action of actions) {
      try {
        if (action.type === "create-card") {
          const title =
            action.title ||
            action.name ||
            action.nome ||
            "Nova tarefa";

          const priority = mapPriority(action.priority || action.prioridade);
          const columnId = action.columnId || mapColumn(action.column || action.localizacao);
          const description = action.description || "";

          const newCard = await Card.create({
            title,
            description,
            priority,
            columnId,
            status: columnId,
            deadline: action.deadline || null,
            estimatedHours: null,
            workedHours: 0,
            assignee: null,
            labels: Array.isArray(action.labels) ? action.labels : [],
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

          const card = await findCard(cardTitle);
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


        if (action.type === "add-checklist") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const items = action.items || action.checklist || [];

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "add-checklist",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

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

        if (action.type === "delete-card") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const card = await findCard(cardTitle);

          if (!card) {
            results.push({
              ok: false,
              type: "delete-card",
              error: "Card não encontrado",
              cardTitle,
            });
            continue;
          }

          await card.destroy();

          results.push({
            ok: true,
            type: "delete-card",
            cardTitle,
          });

          continue;
        }

        if (action.type === "update-deadline") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const deadline =
            action.deadline ||
            action.prazo ||
            action.data;

          if (!deadline) {
            results.push({
              ok: false,
              type: "update-deadline",
              error: "Nenhuma data informada",
              cardTitle,
            });
            continue;
          }

          const card = await findCard(cardTitle);

          if (!card) {
            results.push({
              ok: false,
              type: "update-deadline",
              error: "Card não encontrado",
              cardTitle,
            });
            continue;
          }

          await card.update({ deadline });

          results.push({
            ok: true,
            type: "update-deadline",
            cardTitle,
            deadline,
          });

          continue;
        }

        if (action.type === "bulk-update") {
          // Merge checks: if action has "updates", use Block 1 logic. 
          // If action has "set/where" but NOT "updates", we might fall through or handle here.
          // AI prompt uses "updates".

          const updates = action.updates || action.set || {};
          const where = action.where || {};

          if (Object.keys(updates).length === 0) {
            results.push({ ok: false, type: "bulk-update", error: "Nenhuma alteração definida" });
            continue;
          }

          // Handle specific field parsers if needed (priority/status)
          if (updates.priority) updates.priority = mapPriority(updates.priority);
          if (updates.status) updates.status = mapStatus(updates.status);

          // Execute Mass Update
          const affected = await Card.update(updates, { where });

          results.push({
            ok: true,
            type: "bulk-update",
            updatedCount: affected[0], // Fix: use updatedCount to match Frontend
            updates
          });
          continue;
        }

        if (action.type === "update-checklist-item") {
          const cardTitle = action.cardTitle || action.title || action.nome;
          const itemTitle = action.itemTitle || action.item || action.texto;
          const isDone = action.isDone === true || action.done === true; // Default false if undefined? Probably true if action is update.

          // If AI sends "isDone" explicitly.
          // If user says "mark done", AI sends isDone: true.

          if (!itemTitle) {
            results.push({ ok: false, type: "update-checklist-item", error: "Item não informado" });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({ ok: false, type: "update-checklist-item", error: "Card não encontrado" });
            continue;
          }

          // Find Item
          // Try exact match or iLike
          let item = await Checklist.findOne({ where: { cardId: card.id, text: itemTitle } });
          if (!item) {
            // Try iLike
            try {
              item = await Checklist.findOne({
                where: {
                  cardId: card.id,
                  text: { [Op.iLike]: itemTitle }
                }
              });
            } catch (e) { }
          }
          // Try partial match if not found? "%itemTitle%"
          if (!item) {
            try {
              item = await Checklist.findOne({
                where: {
                  cardId: card.id,
                  text: { [Op.iLike]: `%${itemTitle}%` }
                }
              });
            } catch (e) { }
          }

          if (!item) {
            results.push({ ok: false, type: "update-checklist-item", error: `Item "${itemTitle}" não encontrado no card "${card.title}"` });
            continue;
          }

          await item.update({ done: isDone });

          results.push({
            ok: true,
            type: "update-checklist-item",
            cardTitle: card.title,
            itemTitle: item.text,
            isDone
          });
          continue;
        }

        if (action.type === "update-assignee") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const assignee =
            action.assignee ||
            action.responsavel ||
            action.responsável ||
            action.usuario ||
            action.user;

          if (!assignee) {
            results.push({
              ok: false,
              type: "update-assignee",
              error: "Nenhum responsável informado.",
              cardTitle,
            });
            continue;
          }

          const card = await findCard(cardTitle);

          if (!card) {
            results.push({
              ok: false,
              type: "update-assignee",
              error: "Card não encontrado.",
              cardTitle,
            });
            continue;
          }

          await card.update({ assignee });

          results.push({
            ok: true,
            type: "update-assignee",
            cardTitle,
            assignee,
          });

          continue;
        }

        if (action.type === "update-title") {
          const cardTitle = action.cardTitle || action.nome || action.title;
          const newTitle = action.newTitle || action.title || action.novoTitulo;

          if (!newTitle) {
            results.push({
              ok: false,
              type: "update-title",
              cardTitle,
              error: "Novo título não informado",
            });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "update-title",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          await card.update({ title: newTitle });

          results.push({
            ok: true,
            type: "update-title",
            oldTitle: cardTitle,
            newTitle,
          });

          continue;
        }

        if (action.type === "update-description") {
          const cardTitle = action.cardTitle || action.nome || action.title;
          const description =
            action.description ||
            action.descricao ||
            action.texto;

          if (!description) {
            results.push({
              ok: false,
              type: "update-description",
              cardTitle,
              error: "Nenhuma descrição informada",
            });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "update-description",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          await card.update({ description });

          results.push({
            ok: true,
            type: "update-description",
            cardTitle,
            description,
          });

          continue;
        }

        if (action.type === "update-labels") {
          const cardTitle = action.cardTitle || action.nome || action.title;

          const labels =
            action.labels ||
            action.tags ||
            action.etiquetas ||
            [];

          if (!Array.isArray(labels)) {
            results.push({
              ok: false,
              type: "update-labels",
              cardTitle,
              error: "Labels devem ser uma lista (array)",
            });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "update-labels",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          await card.update({ labels });

          results.push({
            ok: true,
            type: "update-labels",
            cardTitle,
            labels,
          });

          continue;
        }

        if (action.type === "update-priority") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const priority =
            action.priority ||
            action.prioridade;

          if (!priority) {
            results.push({
              ok: false,
              type: "update-priority",
              cardTitle,
              error: "Nenhuma prioridade informada",
            });
            continue;
          }

          const card = await findCard(cardTitle);

          if (!card) {
            results.push({
              ok: false,
              type: "update-priority",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          await card.update({ priority });

          results.push({
            ok: true,
            type: "update-priority",
            cardTitle,
            newPriority: priority,
          });

          continue;
        }

        if (action.type === "update-status") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const statusRaw =
            action.status ||
            action.situacao ||
            action.estado;

          if (!statusRaw) {
            results.push({
              ok: false,
              type: "update-status",
              cardTitle,
              error: "Nenhum status informado",
            });
            continue;
          }

          const status = mapColumn(statusRaw);

          const card = await findCard(cardTitle);

          if (!card) {
            results.push({
              ok: false,
              type: "update-status",
              cardTitle,
              error: "Card não encontrado",
            });
            continue;
          }

          await card.update({ status, columnId: status });

          results.push({
            ok: true,
            type: "update-status",
            cardTitle,
            newStatus: status,
          });

          continue;
        }

        if (action.type === "bulk-delete") {
          const where = action.where || {};

          const query = {};

          if (where.priority) query.priority = mapPriority(where.priority);
          if (where.assignee) query.assignee = where.assignee;
          if (where.status) query.status = where.status;
          if (where.columnId) query.columnId = where.columnId;

          if (where.deadlineBefore) {
            query.deadline = { [Op.lt]: where.deadlineBefore };
          }
          if (where.deadlineAfter) {
            query.deadline = { [Op.gt]: where.deadlineAfter };
          }

          const cards = await Card.findAll({ where: query });

          for (const c of cards) {
            await Checklist.destroy({ where: { cardId: c.id } });
            await c.destroy();
          }

          results.push({
            ok: true,
            type: "bulk-delete",
            deletedCount: cards.length,
            where,
          });

          continue;
        }

        if (action.type === "bulk-update") {
          const where = action.where || {};
          const set = action.set || {};

          const query = {};

          if (where.priority) query.priority = mapPriority(where.priority);
          if (where.assignee) query.assignee = where.assignee;
          if (where.status) query.status = where.status;
          if (where.columnId) query.columnId = where.columnId;

          if (where.deadlineBefore) {
            query.deadline = { [Op.lt]: where.deadlineBefore };
          }
          if (where.deadlineAfter) {
            query.deadline = { [Op.gt]: where.deadlineAfter };
          }

          if (set.priority) set.priority = mapPriority(set.priority);
          if (set.status) set.status = set.status.toLowerCase();

          const cards = await Card.findAll({ where: query });

          for (const card of cards) {
            await card.update(set);
          }


          results.push({
            ok: true,
            type: "bulk-update",
            updatedCount: cards.length,
            where,
            set,
          });

          continue;
        }

        if (action.type === "insight-request") {
          const query = action.query || action.insight;

          if (query === "cards_hoje") {
            const today = new Date().toISOString().substring(0, 10);

            const all = await Card.findAll({
              order: [["deadline", "ASC"]],
            });

            const doDia = all.filter((c) => {
              if (!c.deadline) return false;

              const d = typeof c.deadline === "string"
                ? c.deadline.substring(0, 10)
                : c.deadline.toISOString().substring(0, 10);

              return d === today && c.status !== "done";
            });

            results.push({
              ok: true,
              type: "insight-request",
              insight: "cards_hoje",
              count: doDia.length,
              cards: doDia.map((c) => ({
                id: c.id,
                title: c.title,
                deadline: c.deadline,
                status: c.status,
                priority: c.priority,
              })),
            });

            continue;
          }

          if (query === "cards_atrasados") {
            const today = new Date().toISOString().substring(0, 10);

            const all = await Card.findAll({
              order: [["deadline", "ASC"]],
            });

            const atrasados = all.filter((c) => {
              if (!c.deadline) return false;

              const d = typeof c.deadline === "string"
                ? c.deadline.substring(0, 10)
                : c.deadline.toISOString().substring(0, 10);

              return d < today && c.status !== "done";
            });

            results.push({
              ok: true,
              type: "insight-request",
              insight: "cards_atrasados",
              count: atrasados.length,
              cards: atrasados.map((c) => ({
                id: c.id,
                title: c.title,
                deadline: c.deadline,
                status: c.status,
                priority: c.priority,
                assignee: c.assignee,
                columnId: c.columnId,
              })),
            });

            continue;
          }

          if (query === "burndown") {
            let cards = [];

            // 🔎 FILTRAR POR CARD ESPECÍFICO
            if (action.cardTitle) {
              const card = await findCard(action.cardTitle);

              if (!card) {
                results.push({
                  ok: false,
                  type: "insight-request",
                  insight: "burndown",
                  error: `Card "${action.cardTitle}" não encontrado.`
                });
                continue;
              }

              cards = [card];
            }
            // 🔎 FILTRAR POR COLUNA ESPECÍFICA
            else if (action.columnId) {
              cards = await Card.findAll({
                where: { columnId: action.columnId }
              });
            }
            // 🔎 SEM FILTRO → GLOBAL
            else {
              cards = await Card.findAll();
            }

            // Se não existir cards filtrados
            if (!cards || cards.length === 0) {
              results.push({
                ok: false,
                type: "insight-request",
                insight: "burndown",
                error: "Nenhum card encontrado para o filtro solicitado."
              });
              continue;
            }

            // ===============================
            // 🔥 CÁLCULO DO BURN-DOWN
            // ===============================

            let totalEstimated = 0;
            let totalWorked = 0;

            let overworked = [];
            let noEstimate = [];

            cards.forEach((c) => {
              const est = c.estimatedHours ?? 0;
              const worked = c.workedHours ?? 0;

              totalEstimated += est;
              totalWorked += worked;

              if (est === 0) {
                noEstimate.push({
                  id: c.id,
                  title: c.title,
                });
              } else if (worked > est) {
                overworked.push({
                  id: c.id,
                  title: c.title,
                  estimated: est,
                  worked: worked,
                  diff: worked - est
                });
              }
            });

            results.push({
              ok: true,
              type: "insight-request",
              insight: "burndown",
              totalEstimated,
              totalWorked,
              balance: totalEstimated - totalWorked,
              overworkedCount: overworked.length,
              noEstimateCount: noEstimate.length,
              overworked,
              noEstimate
            });
            continue;
          }
        }

        if (action.type === "update-estimated-hours") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const hours =
            action.estimatedHours ||
            action.horas ||
            action.tempo;

          if (hours === undefined || hours === null || isNaN(hours)) {
            results.push({
              ok: false,
              type: "update-estimated-hours",
              cardTitle,
              error: "Nenhuma quantidade válida de horas foi informada.",
            });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "update-estimated-hours",
              cardTitle,
              error: "Card não encontrado.",
            });
            continue;
          }

          await card.update({ estimatedHours: Number(hours) });

          results.push({
            ok: true,
            type: "update-estimated-hours",
            cardTitle,
            estimatedHours: Number(hours),
          });

          continue;
        }

        if (action.type === "update-worked-hours") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const hours =
            action.workedHours ||
            action.horas ||
            action.tempo;

          if (hours === undefined || hours === null || isNaN(hours)) {
            results.push({
              ok: false,
              type: "update-worked-hours",
              cardTitle,
              error: "Nenhuma quantidade válida de horas trabalhadas foi informada.",
            });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "update-worked-hours",
              cardTitle,
              error: "Card não encontrado.",
            });
            continue;
          }

          await card.update({ workedHours: Number(hours) });

          results.push({
            ok: true,
            type: "update-worked-hours",
            cardTitle,
            workedHours: Number(hours),
          });

          continue;
        }

        if (action.type === "add-worked-hours") {
          const cardTitle =
            action.cardTitle ||
            action.title ||
            action.nome;

          const hours =
            action.hours ||
            action.horas ||
            action.tempo;

          if (hours === undefined || hours === null || isNaN(hours)) {
            results.push({
              ok: false,
              type: "add-worked-hours",
              cardTitle,
              error: "Quantidade inválida para somar.",
            });
            continue;
          }

          const card = await findCard(cardTitle);
          if (!card) {
            results.push({
              ok: false,
              type: "add-worked-hours",
              cardTitle,
              error: "Card não encontrado.",
            });
            continue;
          }

          const newWorked = (card.workedHours || 0) + Number(hours);

          await card.update({ workedHours: newWorked });

          results.push({
            ok: true,
            type: "add-worked-hours",
            cardTitle,
            added: Number(hours),
            workedHours: newWorked,
          });

          continue;
        }

        // Se chegou aqui, nenhuma ação foi correspondida
        if (action.type === "chat-response") {
          results.push({
            ok: true,
            type: "chat-response",
            message: action.message,
          });
          continue;
        }

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
    } // for

    return results;
  },
};
