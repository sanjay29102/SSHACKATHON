const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: "Say hello!" }],
      model: "gpt-4o-mini",
    });

    console.log("SUCCESS:", completion.choices[0].message.content);
  } catch (error) {
    console.error("FAILED:", error.message);
  }
}

main();
