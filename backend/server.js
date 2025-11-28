const express = require("express");
const cors = require("cors");
require("dotenv").config();
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Load website content
const contentPath = path.join(__dirname, "content.json");
let websiteContent = {};
let contextText = "";

try {
  websiteContent = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  contextText = Object.values(websiteContent).flat().join("\n");
  console.log("Website content loaded.");
} catch (err) {
  console.error("Error reading content.json:", err.message);
}

// Function to check match strength
function computeMatchScore(message, content) {
  const msgWords = message.toLowerCase().split(/\s+/);
  let score = 0;

  msgWords.forEach((w) => {
    if (content.toLowerCase().includes(w)) score++;
  });

  return score;
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const matchScore = computeMatchScore(message, contextText);

    // Threshold for soft hybrid mode
    const THRESHOLD = 2; // 2 matching words

    let systemPrompt;

    if (matchScore >= THRESHOLD) {
      console.log("🟢 Website mode activated");

      systemPrompt =
        "You are HybridAI Assistant. Answer ONLY using this website content. " +
        "Use short bullet points. Do not invent facts.\n\n" +
        "WEBSITE CONTENT:\n" +
        contextText;
    } else {
      console.log("🔵 General AI fallback mode");

      systemPrompt =
        "You are a general AI assistant. Give helpful, intelligent, conversational answers. " +
        "Do NOT mention website content unless relevant.";
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Something went wrong. Try again.";

    res.json({ reply });
  } catch (error) {
    console.error("❌ Error in /api/chat:", error);
    res.status(500).json({
      error: "Server error. Check backend logs.",
    });
  }
});

app.listen(10000, () =>
  console.log("🚀 Backend running on http://localhost:10000")
);
