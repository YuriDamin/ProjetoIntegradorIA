const Column = require("./Column");
const Card = require("./Card");
const Checklist = require("./Checklist");

// Column 1:N Card
Column.hasMany(Card, { foreignKey: "columnId" });
Card.belongsTo(Column, { foreignKey: "columnId" });

// Card 1:N Checklist
Card.hasMany(Checklist, { foreignKey: "cardId" });
Checklist.belongsTo(Card, { foreignKey: "cardId" });

module.exports = {
  Column,
  Card,
  Checklist,
};
