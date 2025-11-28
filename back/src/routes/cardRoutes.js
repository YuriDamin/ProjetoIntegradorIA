const express = require("express");
const router = express.Router();
const CardController = require("../controllers/cardController");


router.post("/", CardController.create);
router.put("/:id", CardController.update);
router.delete("/:id", CardController.remove);
router.put("/:id/move", CardController.move);

module.exports = router;
