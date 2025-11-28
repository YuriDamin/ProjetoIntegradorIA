const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Checklist = sequelize.define("Checklist", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  text: DataTypes.STRING,
  done: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  cardId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = Checklist;
