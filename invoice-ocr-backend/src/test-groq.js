const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Say hello!",
        },
      ],
      model: "llama-3.2-11b-vision",
    });

    console.log("SUCCESS:", chatCompletion.choices[0].message.content);
  } catch (error) {
    console.error("FAILED:", error.message);
  }
}

main();
