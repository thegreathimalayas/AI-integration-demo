const express = require("express");
const cors = require("cors");
require("dotenv").config();
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ Load website content from content.json
const contentPath = path.join(__dirname, "content.json");
let websiteContent = {};
let contextText = "";

try {
  websiteContent = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  contextText = Object.values(websiteContent).flat().join("\n");
  console.log("✅ content.json loaded successfully");
} catch (err) {
  console.error("❌ Error reading content.json:", err.message);
}

// ✅ Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are the AI assistant for the HybridAI website. " +
            "You must answer ONLY using the information in the provided website content. " +
            "If the user asks anything that is not clearly answered by the website content, " +
            "you MUST respond with exactly this sentence and nothing else: " +
            "\"I'm sorry, I can only answer questions related to our website content.\" " +
            "When you answer, use short bullet points only (each line starting with •). " +
            "Do not invent any new facts beyond the website content."
        },
        {
          role: "user",
          content:
            `User question:\n${message}\n\n` +
            `Website content:\n${contextText}`
        }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry, I can only answer questions related to our website content.";

    res.json({ reply });
  } catch (error) {
    console.error("❌ Error in /api/chat:", error);
    res.status(500).json({
      error:
        "Server error. Please check backend logs and your GROQ_API_KEY / model configuration."
    });
  }
});

// ✅ FIX FOR RENDER: USE DYNAMIC PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
