const Column = require("./Column");
const Card = require("./Card");
const Checklist = require("./Checklist");

Column.hasMany(Card, { foreignKey: "columnId" });
Card.belongsTo(Column, { foreignKey: "columnId" });

Card.hasMany(Checklist, { foreignKey: "cardId" });
Checklist.belongsTo(Card, { foreignKey: "cardId" });

module.exports = {
  Column,
  Card,
  Checklist,
};
