const express = require("express");
const router = express.Router();
const ColumnController = require("../controllers/columnController");

router.get("/", ColumnController.getBoard);

module.exports = router;
