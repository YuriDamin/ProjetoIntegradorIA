const express = require("express");
const router = express.Router();
const ColumnController = require("../controllers/columnController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, ColumnController.getBoard);

module.exports = router;
