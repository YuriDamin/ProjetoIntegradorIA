const { Column, Card, Checklist } = require("../models");
const { Op } = require("sequelize");

function mapStatus(columnId) {
  if (columnId === "doing") return "doing";
  if (columnId === "done") return "done";
  return "backlog";
}

function normalizePriority(p) {
  if (!p) return "media";

  const val = p.toLowerCase();

  if (val.includes("urg")) return "urgente";
  if (val.includes("alt") || val.includes("high")) return "alta";
  if (val.includes("med")) return "media";
  if (val.includes("bai") || val.includes("low")) return "baixa";

  return "media";
}


function normalizeChecklist(list) {
  return list?.map((item) => ({
    id: item.id,
    text: item.text,
    done: item.done,
  })) ?? [];
}

module.exports = {
  async stats(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Helper to get YYYY-MM-DD in PT-BR (Brasilia Time) for TODAY
      const getPtBRDate = (d) => {
        return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
      };

      const todayStr = getPtBRDate(new Date());

      const allCards = await Card.findAll({
        where: {
          [Op.or]: [
            { status: { [Op.ne]: 'done' } },
            { status: { [Op.is]: null } }
          ],
          deadline: { [Op.not]: null } // Explicitly exclude tasks with no deadline
        }
      });

      let overdue = 0;
      let dueSoon = 0; // Represents "Today"
      let onTrack = 0; // Represents "Future"

      for (const card of allCards) {
        if (!card.deadline) continue;

        // Use ISO string (UTC) for deadline to avoid timezone shifting it to previous day.
        // Assuming deadline is stored as UTC Midnight for the intended date.
        const d = new Date(card.deadline);
        if (isNaN(d.getTime())) continue;

        const cardDateStr = d.toISOString().split('T')[0];
        console.log(`[Stats Debug] Card ${card.id}: DeadlineRaw=${card.deadline}, UTC=${cardDateStr}, TodayData=${todayStr}`);

        if (cardDateStr < todayStr) {
          overdue++;
        } else if (cardDateStr === todayStr) {
          dueSoon++;
        } else {
          onTrack++;
        }
      }

      return res.json({ overdue, dueSoon, onTrack });

    } catch (err) {
      console.error("Erro stats:", err);
      return res.status(500).json({ error: "Erro stats" });
    }
  },

  async create(req, res) {
    try {
      const { title, columnId, priority } = req.body;

      if (!title || !columnId) {
        return res.status(400).json({ error: "title e columnId são obrigatórios" });
      }

      const colExists = await Column.findByPk(columnId);
      if (!colExists) {
        return res.status(400).json({ error: "Coluna inválida" });
      }

      const safePriority = normalizePriority(priority);

      const card = await Card.create({
        title,
        description: "",
        priority: safePriority,
        status: mapStatus(columnId),
        deadline: null,
        estimatedHours: null,
        workedHours: 0,
        assignee: null,
        labels: [],
        columnId,
      });

      return res.status(201).json({
        ...card.dataValues,
        description: "",
        labels: [],
        checklist: [],
      });

    } catch (err) {
      console.error("Erro ao criar card:", err);
      return res.status(500).json({ error: "Erro ao criar card" });
    }
  },


  async update(req, res) {
    try {
      const { id } = req.params;
      const body = req.body;

      const card = await Card.findByPk(id, { include: [Checklist] });
      if (!card) return res.status(404).json({ error: "Card não encontrado" });

      if (body.priority) {
        body.priority = normalizePriority(body.priority);
      }

      const allowedStatuses = ["backlog", "doing", "review", "done"];

      if (body.status && !allowedStatuses.includes(body.status)) {
        return res.status(400).json({
          error: "Status inválido",
          permitido: allowedStatuses
        });
      }


      await card.update(body);


      if (Array.isArray(body.checklist)) {
        const existing = await Checklist.findAll({ where: { cardId: id } });
        const existingIds = existing.map((c) => c.id);
        const incomingIds = body.checklist.filter((i) => i.id).map((i) => i.id);

        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
        if (toDelete.length) {
          await Checklist.destroy({ where: { id: toDelete } });
        }

        for (const item of body.checklist) {
          if (item.id && existingIds.includes(item.id)) {
            await Checklist.update(
              { text: item.text, done: item.done },
              { where: { id: item.id } }
            );
          } else {
            await Checklist.create({
              text: item.text,
              done: item.done,
              cardId: id,
            });
          }
        }
      }

      const updated = await Card.findByPk(id, { include: [Checklist] });

      return res.json({
        ...updated.dataValues,
        description: updated.description ?? "",
        labels: Array.isArray(updated.labels) ? updated.labels : [],
        checklist: normalizeChecklist(updated.Checklists),
      });

    } catch (err) {
      console.error("Erro ao atualizar card:", err);
      return res.status(500).json({ error: "Erro ao atualizar card" });
    }
  },


  async remove(req, res) {
    try {
      const { id } = req.params;

      await Checklist.destroy({ where: { cardId: id } });
      await Card.destroy({ where: { id } });

      return res.json({ message: "Card removido com sucesso" });

    } catch (err) {
      console.error("Erro ao remover card:", err);
      return res.status(500).json({ error: "Erro ao remover card" });
    }
  },

  async move(req, res) {
    try {
      const { id } = req.params;
      const { toColumn } = req.body;

      const card = await Card.findByPk(id);
      if (!card)
        return res.status(404).json({ error: "Card não encontrado" });

      const col = await Column.findByPk(toColumn);
      if (!col)
        return res.status(400).json({ error: "Coluna destino inválida" });

      await card.update({
        columnId: toColumn,
        status: mapStatus(toColumn),
      });

      const updated = await Card.findByPk(id, { include: [Checklist] });

      return res.json({
        ...updated.dataValues,
        description: updated.description ?? "",
        labels: Array.isArray(updated.labels) ? updated.labels : [],
        checklist: normalizeChecklist(updated.Checklists),
      });

    } catch (err) {
      console.error("Erro ao mover card:", err);
      return res.status(500).json({ error: "Erro ao mover card" });
    }
  },
};
