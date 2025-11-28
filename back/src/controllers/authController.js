const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  async register(req, res) {
    const { name, email, password } = req.body;

    try {
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(400).json({ error: "Email já existe" });

      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hash });

      return res.json({
        message: "Usuário criado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao registrar usuário" });
    }
  },

  async login(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user)
        return res.status(404).json({ error: "Usuário não encontrado" });

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(400).json({ error: "Senha incorreta" });

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );


      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao autenticar" });
    }
  }
};
