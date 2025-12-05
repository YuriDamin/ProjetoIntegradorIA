const { Card } = require("./src/models");
const sequelize = require("./src/config/database");

(async () => {
    try {
        await sequelize.authenticate();
        console.log("Conection OK.");

        const cards = await Card.findAll();
        console.log(`Found ${cards.length} cards.`);

        cards.forEach(c => {
            console.log("--------------------------------------------------");
            console.log(`ID: ${c.id}`);
            console.log(`Title: ${c.title}`);
            console.log(`Deadline: ${c.deadline} (Type: ${typeof c.deadline})`);
            console.log(`JSON Deadline: ${JSON.stringify(c.deadline)}`);
        });

    } catch (err) {
        console.error(err);
    }
})();
