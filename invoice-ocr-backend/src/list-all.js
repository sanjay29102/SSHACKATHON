const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
groq.models.list().then(m => {
  m.data.forEach(d => console.log(d.id));
});
