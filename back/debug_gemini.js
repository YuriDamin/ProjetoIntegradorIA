require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    console.log("--- DEBUGGER GEMINI API ---");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("❌ NO KEY FOUND in process.env");
        return;
    }
    console.log(`Key found: ${key.substring(0, 5)}...${key.substring(key.length - 4)} (Length: ${key.length})`);

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
        console.log("Attempting to generate content...");
        const start = Date.now();
        const result = await model.generateContent("Hello, verify quota.");
        const duration = Date.now() - start;
        console.log(`✅ Success! Response time: ${duration}ms`);
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("❌ Request Failed:");
        console.error(error.message);
        if (error.response) {
            console.error("Details:", JSON.stringify(error.response, null, 2));
        }
    }
}

check();
