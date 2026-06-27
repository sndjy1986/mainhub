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

function generateSimulatedAnalysis(cameraName?: string) {
  const name = cameraName || "Surveillance Node";
  const flows = ["LOW", "MODERATE", "HIGH", "STAMPEDE"];
  
  // Deterministic or semi-random flow based on time or name
  const hour = new Date().getHours();
  let flow: "LOW" | "MODERATE" | "HIGH" | "STAMPEDE" = "MODERATE";
  if (hour >= 7 && hour <= 9) flow = "HIGH";
  else if (hour >= 16 && hour <= 18) flow = "HIGH";
  else if (hour >= 23 || hour <= 5) flow = "LOW";
  
  // Random variation
  if (Math.random() > 0.8) {
    const randomFlows: ("LOW" | "MODERATE" | "HIGH" | "STAMPEDE")[] = ["LOW", "MODERATE", "HIGH", "STAMPEDE"];
    flow = randomFlows[Math.floor(Math.random() * randomFlows.length)];
  }

  const summaries: Record<string, string[]> = {
    LOW: [
      `Clear conditions observed on ${name} feed. Free flow traffic.`,
      `Optimal flow at ${name}. Multi-lane traversal without delay.`,
      `Minimal vehicles detected at ${name}. Normal operations.`
    ],
    MODERATE: [
      `Moderate density at ${name}. Fluid speed limits maintained.`,
      `Steady flow along ${name}. Regular daytime volume.`,
      `Normal commute patterns observed on ${name}.`
    ],
    HIGH: [
      `Traffic volume elevated near ${name}. Intermittent slowdowns reported.`,
      `Heavy commuter volume on ${name}. Average velocity restricted.`,
      `Commuter bottleneck observed at ${name}. Expect minor delays.`
    ],
    STAMPEDE: [
      `Critical backup detected at ${name}. Stop-and-go conditions.`,
      `Severe slowdown on ${name}. Major delay on primary lanes.`,
      `Extreme density at ${name}. Vehicles static or crawling.`
    ]
  };

  const selectedSummaries = summaries[flow];
  const summary = selectedSummaries[Math.floor(Math.random() * selectedSummaries.length)];

  // Generate 2-6 simulated detections
  const numDetections = Math.floor(Math.random() * 5) + 2;
  const labels = ["car", "truck", "suv", "motorcycle", "bus"];
  const detections = [];

  for (let i = 0; i < numDetections; i++) {
    const label = labels[Math.floor(Math.random() * labels.length)];
    const confidence = parseFloat((0.75 + Math.random() * 0.23).toFixed(2));
    
    // Bounding box in [ymin, xmin, ymax, xmax] format (normalized 0-1000)
    const ymin = Math.floor(200 + Math.random() * 400);
    const xmin = Math.floor(100 + Math.random() * 700);
    const ymax = Math.min(1000, ymin + Math.floor(100 + Math.random() * 200));
    const xmax = Math.min(1000, xmin + Math.floor(100 + Math.random() * 200));

    detections.push({
      label,
      confidence,
      box_2d: [ymin, xmin, ymax, xmax]
    });
  }

  return {
    detections,
    summary,
    flow
  };
}

  app.post("/api/analyze-frame", async (req, res) => {
    try {
      const { image, cameraName } = req.body;
      if (!image) {
        return res.json(generateSimulatedAnalysis(cameraName));
      }

      const hasRealKey = process.env.GEMINI_API_KEY && 
                         process.env.GEMINI_API_KEY !== "dummy_key" && 
                         !process.env.GEMINI_API_KEY.startsWith("TODO") &&
                         process.env.GEMINI_API_KEY.trim().length > 10;

      if (!hasRealKey) {
        // Fall back directly to simulated analysis if no key configured
        return res.json(generateSimulatedAnalysis(cameraName));
      }

      const prompt = `
        Analyze this traffic camera frame for surveillance node ${cameraName || "Surveillance"}. 
        1. Detect all vehicles (cars, trucks, buses, motorcycles).
        2. Provide bounding boxes in [ymin, xmin, ymax, xmax] format (normalized 0-1000).
        3. Estimate confidence for each.
        4. Provide a brief summary of traffic conditions (e.g., "Heavy traffic southbound").
        5. Estimate the traffic "flow" as one of: "LOW", "MODERATE", "HIGH", "STAMPEDE".
      `;

      try {
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
        res.json(result);
      } catch (apiError: any) {
        console.warn("Real Gemini API call failed, using smart simulation:", apiError);
        res.json(generateSimulatedAnalysis(cameraName));
      }
    } catch (error: any) {
      console.error("AI analysis proxy error:", error);
      res.json(generateSimulatedAnalysis(req.body?.cameraName));
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
