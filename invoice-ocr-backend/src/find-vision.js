const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
  try {
    const models = await groq.models.list();
    console.log("Vision/OCR capable models:");
    models.data.forEach(m => {
      // Check for vision in ID
      if (m.id.toLowerCase().includes('vision')) {
        console.log(`- ${m.id}`);
      }
    });
  } catch (error) {
    console.error("FAILED:", error.message);
  }
}

main();
