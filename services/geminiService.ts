import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not set");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const suggestTagsForNote = async (content: string): Promise<string[]> => {
  const ai = getClient();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following note and suggest up to 3 relevant short tags (single words, use Chinese if the content is Chinese). Return only the tags. Note: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const tags = JSON.parse(response.text || "[]");
    return tags;
  } catch (error) {
    console.error("Gemini tagging error:", error);
    return [];
  }
};

export const analyzeDataTrend = async (label: string, dataPoints: {date: string, value: number}[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "无法分析。";

  try {
    const dataStr = JSON.stringify(dataPoints.slice(-10)); // Analyze last 10 points
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `分析"${label}"的数据趋势: ${dataStr}。给出一句简短的中文洞察或鼓励。`,
    });
    return response.text || "";
  } catch (error) {
    return "分析失败。";
  }
};