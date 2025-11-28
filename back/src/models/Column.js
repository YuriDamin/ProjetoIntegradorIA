const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Column = sequelize.define("Column", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Column;
