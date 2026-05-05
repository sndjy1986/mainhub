import { GoogleGenAI, Type } from "@google/genai";
import { AiAnalysisResult } from "./camsTypes";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeFrame(base64Image: string): Promise<AiAnalysisResult> {
  const parts = base64Image.split(',');
  const data = parts.length > 1 ? parts[1] : base64Image;

  if (!data || data.length < 100) {
    return {
      detections: [],
      summary: "EMPTY SIGNAL SOURCE",
      flow: 'LOW',
      timestamp: new Date().toLocaleTimeString(),
    };
  }

  const prompt = `
    Analyze this traffic camera frame. 
    1. Detect all vehicles (cars, trucks, buses, motorcycles).
    2. Provide bounding boxes in [ymin, xmin, ymax, xmax] format (normalized 0-1000).
    3. Estimate confidence for each.
    4. Provide a brief summary of traffic conditions (e.g., "Heavy traffic southbound").
    5. Estimate the traffic "flow" as one of: "LOW", "MODERATE", "HIGH", "STAMPEDE".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: data,
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
                    description: "[ymin, xmin, ymax, xmax]"
                  },
                },
                required: ["label", "confidence", "box_2d"],
              },
            },
            summary: { type: Type.STRING },
            flow: { 
              type: Type.STRING,
              enum: ["LOW", "MODERATE", "HIGH", "STAMPEDE"]
            },
          },
          required: ["detections", "summary", "flow"],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      ...result,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      detections: [],
      summary: "AI ANALYSIS ERROR",
      flow: 'LOW',
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}
