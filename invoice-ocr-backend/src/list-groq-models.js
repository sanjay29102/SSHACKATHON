const Groq = require("groq-sdk");
const fs = require('fs');
const dotenv = require("dotenv");
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
  try {
    const models = await groq.models.list();
    fs.writeFileSync('groq_models.json', JSON.stringify(models, null, 2));
    console.log("Done writing to groq_models.json");
  } catch (error) {
    console.error("FAILED to list models:", error.message);
  }
}

main();
