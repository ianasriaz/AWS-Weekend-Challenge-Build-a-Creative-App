import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const REGION = process.env.AWS_REGION || "us-east-1";

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Initialize AWS Clients
const bedrockClient = new BedrockRuntimeClient({ region: REGION });
const pollyClient = new PollyClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

// Primary & Fallback Bedrock Models
const BEDROCK_MODELS = [
  "us.amazon.nova-lite-v1:0",
  "us.amazon.nova-micro-v1:0",
  "us.amazon.nova-pro-v1:0"
];

// System Prompt for Comic Narrative Generation
const COMIC_SYSTEM_PROMPT = `
You are "ComicCraft AI", a world-class comic book author and cartoon storyboard artist.
Your job is to take user prompts and craft an engaging, hilarious, visually striking 4-PANEL COMIC STRIP.

RULES:
1. The comic must strictly have exactly 4 panels:
   - Panel 1: The Setup (introduce the characters, setting, and initial premise)
   - Panel 2: The Action/Escalation (complication begins or wacky experiment starts)
   - Panel 3: The Climax / Twist (unexpected chaos, surprise reaction)
   - Panel 4: The Punchline / Resolution (hilarious conclusion or aftermath)
2. Characters should have distinct personalities, sharp snappy dialogue, gender assignment, and comic timing.
3. INTELLIGENT MEME AUTO-MATCHING:
   - For Panel 4 (The Grand Punchline), you MUST select the single most accurate "memeReaction" key that represents the punchline reaction:
     - "disaster_girl" -> for chaotic accidents, explosions, water leaks, kitchen disasters, or mischievous smirks.
     - "waiting_pablo" -> for endless delays, long queues, waiting at the mall, or loneliness.
     - "distracted_boyfriend" -> for diet cheats, shiny temptations, wandering attention, or ditching commitments.
     - "woman_yelling_cat" -> for shouting over food/bills, dinner arguments, or innocent confused reactions.
     - "side_eye_chloe" -> for skeptical squinting, ridiculous excuses, disbelief, or absurd claims.
     - "awkward_gavin" -> for unmuted mic blunders, cringe moments, caught red-handed, or forced awkward smiles.
     - "disappointed_fan" -> for forgotten groceries, obvious blunders, failed DIY, or hands-on-hips silent judgment.
4. Every panel must have:
   - "panelNumber": 1, 2, 3, or 4
   - "caption": A short narrative voiceover (1 sentence)
   - "sceneDescription": A vivid description of the visuals, lighting, action, and character expressions
   - "character1": { "name": "Character Name", "dialogue": "Dialogue text", "emotion": "happy/panicking/etc", "avatar": "emoji", "voiceGender": "female/male" }
   - "character2": { "name": "Character Name or null", "dialogue": "Reply text", "emotion": "surprised/worried/etc", "avatar": "emoji", "voiceGender": "male/female" }
   - "soundEffect": A classic comic sound word (e.g., "KABOOM!", "BZZZZT!", "POW!", "SLURP!", "404 ERROR!", "PING!")
   - "memeReaction": (REQUIRED for Panel 4) One of ["disaster_girl", "waiting_pablo", "distracted_boyfriend", "woman_yelling_cat", "side_eye_chloe", "awkward_gavin", "disappointed_fan"]
   - "colorScheme": { "bgGradient": "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", "accent": "#fbbf24" }

OUTPUT FORMAT:
You MUST reply with ONLY a raw valid JSON object (no markdown fences, no formatting text).
Structure:
{
  "title": "Catchy Comic Title",
  "logline": "1-sentence funny summary",
  "genre": "Comedy",
  "characters": [
    { "name": "Name", "role": "Role", "voiceGender": "female" }
  ],
  "panels": [
    {
      "panelNumber": 1,
      "caption": "Narrative caption",
      "sceneDescription": "Scene description",
      "character1": { "name": "Name", "dialogue": "Dialogue text", "emotion": "happy", "avatar": "🧑", "voiceGender": "female" },
      "character2": { "name": "Name", "dialogue": "Reply text", "emotion": "surprised", "avatar": "👩", "voiceGender": "male" },
      "soundEffect": "BZZT!",
      "memeReaction": null,
      "colorScheme": { "bgGradient": "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", "accent": "#fbbf24" }
    },
    {
      "panelNumber": 4,
      "caption": "Final punchline caption",
      "sceneDescription": "Scene description",
      "character1": { "name": "Name", "dialogue": "Punchline line 1", "emotion": "shocked", "avatar": "🧑", "voiceGender": "female" },
      "character2": { "name": "Name", "dialogue": "Punchline line 2", "emotion": "speechless", "avatar": "👩", "voiceGender": "male" },
      "soundEffect": "KABOOM!",
      "memeReaction": "disaster_girl",
      "colorScheme": { "bgGradient": "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", "accent": "#ef4444" }
    }
  ]
}
`;

// Helper: Extract JSON safely
function extractJson(text) {
  if (!text) throw new Error("Empty response from model");
  try {
    const clean = text.replace(/^```json\s*/im, "").replace(/^```\s*/im, "").replace(/\s*```$/m, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(sub);
    }
    throw new Error(`Failed to parse JSON: ${e.message}. Raw text: ${text.substring(0, 100)}...`);
  }
}

// Helper: Call Bedrock with Fallbacks
async function callBedrock(promptText, systemPrompt) {
  let lastError = null;
  for (const modelId of BEDROCK_MODELS) {
    try {
      console.log(`[Bedrock] Calling ${modelId}...`);
      const command = new ConverseCommand({
        modelId,
        messages: [{ role: "user", content: [{ text: promptText }] }],
        system: [{ text: systemPrompt }],
        inferenceConfig: { maxTokens: 2500, temperature: 0.85, topP: 0.9 }
      });

      const response = await bedrockClient.send(command);
      const textOutput = response.output?.message?.content?.[0]?.text;
      if (textOutput) {
        const parsed = extractJson(textOutput);
        parsed.sourceModel = modelId;
        return parsed;
      }
    } catch (err) {
      console.warn(`[Bedrock] ${modelId} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw new Error(`Bedrock failed: ${lastError?.message || "Unknown error"}`);
}

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ComicCraft AI Studio", region: REGION, models: BEDROCK_MODELS });
});

// Route: Generate Comic
app.post("/api/generate-comic", async (req, res) => {
  try {
    const { prompt, style, genre } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const promptText = `Create a 4-panel comic strip based on:
Prompt: "${prompt}"
Style: ${style || "Retro Comic Book"}
Genre: ${genre || "Comedy"}
Make it hilarious, witty, with sharp punchlines! Return ONLY raw JSON.`;

    const comicData = await callBedrock(promptText, COMIC_SYSTEM_PROMPT);
    res.json({ success: true, comic: comicData });
  } catch (error) {
    console.error("[Generate Error]:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Reroll Single Panel
app.post("/api/reroll-panel", async (req, res) => {
  try {
    const { comic, panelNumber } = req.body;
    const promptText = `Given this comic story:
Title: "${comic.title}"
Existing Panels: ${JSON.stringify(comic.panels)}
Generate an alternative version for PANEL ${panelNumber}. Return ONLY raw JSON for this single panel.`;

    const newPanel = await callBedrock(promptText, COMIC_SYSTEM_PROMPT);
    res.json({ success: true, panel: newPanel.panels ? newPanel.panels[0] : newPanel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Synthesize Polly Speech
app.post("/api/synthesize-voice", async (req, res) => {
  try {
    const { text, voiceId = "Ruth", engine = "neural" } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    let command = new SynthesizeSpeechCommand({ OutputFormat: "mp3", Text: text, VoiceId: voiceId, Engine: engine });
    let pollyRes;
    try {
      pollyRes = await pollyClient.send(command);
    } catch (err) {
      command = new SynthesizeSpeechCommand({ OutputFormat: "mp3", Text: text, VoiceId: voiceId, Engine: "standard" });
      pollyRes = await pollyClient.send(command);
    }

    if (pollyRes.AudioStream) {
      const chunks = [];
      for await (const chunk of pollyRes.AudioStream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      res.json({ success: true, audioBase64: `data:audio/mp3;base64,${buffer.toString("base64")}`, voiceId });
    } else {
      res.status(500).json({ error: "No audio stream returned" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Multi-Voice Duet
app.post("/api/synthesize-duet", async (req, res) => {
  try {
    const { parts } = req.body;
    const audioClips = [];
    for (const part of parts) {
      if (!part.text?.trim()) continue;
      const vId = part.voiceId || "Ruth";
      let command = new SynthesizeSpeechCommand({ OutputFormat: "mp3", Text: part.text, VoiceId: vId, Engine: "neural" });
      let pollyRes;
      try {
        pollyRes = await pollyClient.send(command);
      } catch (err) {
        command = new SynthesizeSpeechCommand({ OutputFormat: "mp3", Text: part.text, VoiceId: vId, Engine: "standard" });
        pollyRes = await pollyClient.send(command);
      }
      if (pollyRes.AudioStream) {
        const chunks = [];
        for await (const chunk of pollyRes.AudioStream) chunks.push(chunk);
        audioClips.push({ speaker: part.speaker, voiceId: vId, audioBase64: `data:audio/mp3;base64,${Buffer.concat(chunks).toString("base64")}` });
      }
    }
    res.json({ success: true, clips: audioClips });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎨 ComicCraft AI Studio is running on http://localhost:${PORT}`);
    console.log(`📍 AWS Region: ${REGION}`);
    console.log(`⚡ Bedrock Models: ${BEDROCK_MODELS.join(", ")}`);
    console.log(`======================================================\n`);
  });
}

export default app;
