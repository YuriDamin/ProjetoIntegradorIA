const { Card } = require("./src/models");
const sequelize = require("./src/config/database");
const { Op } = require("sequelize");

async function debugLookup(title) {
    try {
        await sequelize.authenticate();
        const userId = 1; // Assuming User 1 based on previous dumps

        console.log(`Testing lookup for: "${title}" (User: ${userId})`);

        // 1. Exact
        let card = await Card.findOne({ where: { title, userId } });
        if (card) { console.log("✅ Exact match"); return; }
        console.log("❌ Exact match failed");

        // 2. iLike
        try {
            card = await Card.findOne({ where: { title: { [Op.iLike]: title }, userId } });
            if (card) { console.log("✅ iLike match"); return; }
            console.log("❌ iLike match failed (null)");
        } catch (e) {
            console.log("⚠️ iLike threw error:", e.message);
            // Fallback Like
            card = await Card.findOne({ where: { title: { [Op.like]: title }, userId } });
            if (card) { console.log("✅ Like match"); return; }
            console.log("❌ Like match failed");
        }

        // 3. Fuzzy
        try {
            card = await Card.findOne({ where: { title: { [Op.iLike]: `%${title}%` }, userId } });
            if (card) { console.log("✅ Fuzzy iLike match"); return; }
            console.log("❌ Fuzzy iLike match failed");
        } catch (e) {
            console.log("⚠️ Fuzzy iLike threw error");
            card = await Card.findOne({ where: { title: { [Op.like]: `%${title}%` }, userId } });
            if (card) { console.log("✅ Fuzzy Like match"); return; }
            console.log("❌ Fuzzy Like match failed");
        }

        console.log("❌ ALL FAILED");

    } catch (error) {
        console.error("Script Error:", error);
    } finally {
        await sequelize.close();
    }
}

debugLookup("ir na padaria");
