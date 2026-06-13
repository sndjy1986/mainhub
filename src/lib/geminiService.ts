import { AiAnalysisResult } from "./camsTypes";

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

  try {
    const response = await fetch('/api/analyze-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
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
