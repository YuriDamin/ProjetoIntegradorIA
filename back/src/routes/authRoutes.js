const express = require("express");
const router = express.Router();
const Auth = require("../controllers/authController");

router.post("/register", Auth.register);
router.post("/login", Auth.login);

module.exports = router;
