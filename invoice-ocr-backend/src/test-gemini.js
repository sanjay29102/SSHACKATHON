const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

async function testModel() {
  const modelName = "gemini-2.5-pro";
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`Testing model: ${modelName}`);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello");
    console.log("SUCCESS:", result.response.text());
  } catch (error) {
    console.error("FAILED:", error.message);
    if (error.response) {
        console.dir(error.response, { depth: null });
    }
  }
}

testModel();
