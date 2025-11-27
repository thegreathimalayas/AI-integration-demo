const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Load content.json (must be inside functions folder)
const contentPath = path.join(__dirname, "content.json");
let websiteContent = {};
let contextText = "";

try {
  websiteContent = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  contextText = Object.values(websiteContent).flat().join("\n");
  console.log("content.json loaded");
} catch (err) {
  console.error("Error loading content.json:", err.message);
}

// Chat endpoint
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
            "You must answer ONLY using the provided website text. " +
            'If the user asks anything outside the content, reply: "I\'m sorry, I can only answer questions related to our website content."'
        },
        {
          role: "user",
          content: `User: ${message}\n\nWebsite:\n${contextText}`
        }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry, I can only answer questions related to our website content.";

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      error: "Server error - check logs"
    });
  }
});

// EXPORT EXPRESS APP AS CLOUD FUNCTION
exports.api = functions.https.onRequest(app);
