const { Column, Card, Checklist } = require("../models");


function mapStatus(columnId) {
  if (columnId === "doing") return "doing";
  if (columnId === "done") return "done";
  return "backlog";
}

function normalizePriority(p) {
  if (!p) return "media";
  const val = p.toLowerCase();

  if (["urgente", "alta", "media", "baixa"].includes(val)) {
    return val;
  }

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

 
  async create(req, res) {
    try {
      const { title, columnId } = req.body;

      if (!title || !columnId) {
        return res.status(400).json({ error: "title e columnId são obrigatórios" });
      }

      const colExists = await Column.findByPk(columnId);
      if (!colExists) {
        return res.status(400).json({ error: "Coluna inválida" });
      }

      const safePriority = normalizePriority(req.body.priority);

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

      if (body.status && !["backlog", "doing", "done"].includes(body.status)) {
        body.status = mapStatus(card.columnId);
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
