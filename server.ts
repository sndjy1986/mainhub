import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import { GoogleGenAI, Type } from "@google/genai";

const parser = new Parser();

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });
  }
  return ai;
}

const NEWS_FEEDS: Record<string, string> = {
  cnn: "http://rss.cnn.com/rss/cnn_topstories.rss",
  fox: "http://feeds.foxnews.com/foxnews/latest",
  tech: "https://feeds.feedburner.com/TechCrunch/",
  google: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
  reuters: "https://www.reutersagency.com/feed/",
  associated_press:
    "https://news.google.com/rss/search?q=associated+press&hl=en-US&gl=US&ceid=US:en",
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/news", async (req, res) => {
    try {
      const source = (req.query.source as string) || "google";
      const feedUrl = NEWS_FEEDS[source] || NEWS_FEEDS.google;

      const feed = await parser.parseURL(feedUrl);

      const items = feed.items.map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet,
        source: feed.title,
      }));

      res.json({
        title: feed.title,
        items: items.slice(0, 20),
      });
    } catch (error) {
      console.error("News proxy error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/wotd", async (req, res) => {
    try {
      const feed = await parser.parseURL(
        "https://www.merriam-webster.com/wotd/feed/rss2",
      );
      const item = feed.items[0];
      res.json({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet,
      });
    } catch (error) {
      console.error("WOTD proxy error:", error);
      res.status(500).json({ error: "Failed to fetch WOTD" });
    }
  });

  app.get("/api/scanner/audio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`https://radioapi.sndjy.us/audio/${id}`);
      if (!response.ok) {
        return res.status(response.status).end();
      }
      res.setHeader("Content-Type", "audio/mp4");
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Audio proxy error:", error);
      res.status(500).end();
    }
  });

  app.get("/api/scanner/latest-v2", async (req, res) => {
    try {
      const response = await fetch("https://radioapi.sndjy.us/latest");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Scanner proxy error:", error);
      res.status(500).json({ error: "Failed to fetch scanner data" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze-frame", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image data" });
      }

      const prompt = `
        Analyze this traffic camera frame. 
        1. Detect all vehicles (cars, trucks, buses, motorcycles).
        2. Provide bounding boxes in [ymin, xmin, ymax, xmax] format (normalized 0-1000).
        3. Estimate confidence for each.
        4. Provide a brief summary of traffic conditions (e.g., "Heavy traffic southbound").
        5. Estimate the traffic "flow" as one of: "LOW", "MODERATE", "HIGH", "STAMPEDE".
      `;

      const aiClient = getAiClient();
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    box_2d: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                      description: "[ymin, xmin, ymax, xmax]",
                    },
                  },
                  required: ["label", "confidence", "box_2d"],
                },
              },
              summary: { type: Type.STRING },
              flow: {
                type: Type.STRING,
                enum: ["LOW", "MODERATE", "HIGH", "STAMPEDE"],
              },
            },
            required: ["detections", "summary", "flow"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      // Fix potential format issues from JSON parsing
      res.json(result);
    } catch (error: any) {
      console.error("AI analysis proxy error:", error);
      res
        .status(500)
        .json({
          error: "Failed to analyze frame",
          details: error.message,
          stack: error.stack,
        });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
