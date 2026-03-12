const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("process.env.GEMINI_API_KEY =", process.env.GEMINI_API_KEY ? "defined" : "undefined");
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + process.env.GEMINI_API_KEY);
    const data = await response.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
run();
