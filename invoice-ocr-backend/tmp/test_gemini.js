const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("process.env.GEMINI_API_KEY =", process.env.GEMINI_API_KEY ? "defined" : "undefined");
  try {
    const models = await genAI.getGlobalModels ? await genAI.getGlobalModels() : 'no getGlobalModels?';
    // Actually getGenerativeModel works. How to list models?
    // wait, @google/generative-ai version: let's just make a simple generateContent call.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("hello");
    console.log(result.response.text());
  } catch (err) {
    console.error(err);
  }
}
run();
