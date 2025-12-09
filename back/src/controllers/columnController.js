const { Column, Card, Checklist } = require("../models");

async function ensureDefaultColumns() {
  const exists = await Column.count();
  if (exists === 0) {
    await Column.bulkCreate([
      { id: "backlog", title: "Backlog" },
      { id: "doing", title: "Em andamento" },
      { id: "done", title: "Concluído" },
    ]);
  }
}

module.exports = {
  async getBoard(req, res) {
    try {
      // await ensureDefaultColumns(); // Moved to startup for performance

      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const columns = await Column.findAll({
        include: [
          {
            model: Card,
            where: { userId: req.user.id },
            required: false, // Important: Still return columns even if they have no cards for this user
            include: [Checklist],
          },
        ],
        order: [["id", "ASC"]],
      });

      const columnOrder = columns.map((c) => c.id);

      const columnsObj = {};
      for (const col of columns) {
        columnsObj[col.id] = {
          id: col.id,
          title: col.title,
          cards: col.Cards.map((card) => ({
            id: card.id,
            title: card.title,
            description: card.description,
            priority: card.priority,
            status: card.status,
            deadline: card.deadline,
            estimatedHours: card.estimatedHours,
            workedHours: card.workedHours,
            assignee: card.assignee,
            labels: card.labels || [],
            checklist: card.Checklists.map((c) => ({
              id: c.id,
              text: c.text,
              done: c.done,
            })),
            columnId: card.columnId,
          })),
        };
      }

      return res.json({
        columnOrder,
        columns: columnsObj,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao carregar board" });
    }
  },
};
