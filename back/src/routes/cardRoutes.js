const express = require("express");
const router = express.Router();
const CardController = require("../controllers/cardController");
const authMiddleware = require("../middlewares/authMiddleware");


router.get("/stats", authMiddleware, CardController.stats);
router.post("/", authMiddleware, CardController.create);
router.put("/:id", authMiddleware, CardController.update);
router.delete("/:id", authMiddleware, CardController.remove);
router.put("/:id/move", authMiddleware, CardController.move);

module.exports = router;
