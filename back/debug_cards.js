const { Card } = require("./src/models");
const sequelize = require("./src/config/database");

async function listCards() {
    try {
        await sequelize.authenticate();
        const cards = await Card.findAll();
        console.log("=== LISTA DE CARDS NO BANCO ===");
        cards.forEach(c => {
            console.log(`[${c.id}] "${c.title}" (User: ${c.userId})`);
        });
        console.log("===============================");
    } catch (error) {
        console.error("Erro:", error);
    } finally {
        await sequelize.close();
    }
}

listCards();
