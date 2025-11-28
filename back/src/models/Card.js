const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Card = sequelize.define("Card", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  priority: DataTypes.STRING,
  status: DataTypes.STRING,
  deadline: DataTypes.STRING,
  estimatedHours: DataTypes.INTEGER,
  workedHours: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  assignee: DataTypes.STRING,
  labels: DataTypes.ARRAY(DataTypes.STRING),
  columnId: DataTypes.STRING,
});

module.exports = Card;
