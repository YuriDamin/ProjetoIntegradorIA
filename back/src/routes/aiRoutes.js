const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const aiController = require("../controllers/aiController");

router.post("/chat", authMiddleware, aiController.chat);

module.exports = router;
