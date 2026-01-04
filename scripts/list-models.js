
const path = require("path");
const fs = require("fs");

// Load env
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const match = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

async function listModels() {
    try {
        console.log("Fetching Gemini models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        const outFile = path.resolve(__dirname, "../models_clean.txt");
        let output = "";

        if (data.models) {
            const geminiModels = data.models.filter(m => m.name.toLowerCase().includes("gemini"));
            if (geminiModels.length > 0) {
                output += "Found Gemini Models:\n";
                geminiModels.forEach(m => output += m.name + "\n");
            } else {
                output += "No Gemini models found. All models:\n" + data.models.map(m => m.name).join(", ");
            }
        } else {
            output += "No models found or error:\n" + JSON.stringify(data, null, 2);
        }

        fs.writeFileSync(outFile, output);
        console.log("Written to models_clean.txt");

    } catch (error) {
        console.error("Error fetching models:", error.message);
    }
}

listModels();
