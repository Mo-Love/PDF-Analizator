
import { GoogleGenAI, Type } from "@google/genai";

// Assume API_KEY is set in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API key for Gemini is not set. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Interface for the structured analysis result.
 */
export interface AnalysisResult {
  overview: string;
  components: string[];
  tools: string[];
  steps: string[];
}

/**
 * Generates a structured analysis for the given guide text using the Gemini API.
 * @param text The text to analyze.
 * @returns A promise that resolves with the structured analysis.
 */
export const analyzeGuideText = async (text: string): Promise<AnalysisResult> => {
  if (!API_KEY) {
    return Promise.reject(new Error("API ключ не налаштовано."));
  }
  
  try {
    const prompt = `Проаналізуй наступний посібник (ймовірно, зі збірки FPV-дрона) українською мовою. Витягни ключову інформацію та поверни її у форматі JSON.

Текст для аналізу:
---
${text}
---
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overview: {
                        type: Type.STRING,
                        description: 'Короткий огляд посібника на 2-4 речення.'
                    },
                    components: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Список основних компонентів, згаданих у тексті, необхідних для збірки.'
                    },
                    tools: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Список інструментів, згаданих у тексті, необхідних для збірки.'
                    },
                    steps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Основні кроки процесу збірки, описані коротко.'
                    }
                },
                required: ['overview', 'components', 'tools', 'steps']
            }
        }
    });

    const resultJson = response.text;
    if (!resultJson) {
      throw new Error('Отримано порожню відповідь від API.');
    }

    const parsedResult = JSON.parse(resultJson);

    // Basic validation
    if (!parsedResult.overview || !Array.isArray(parsedResult.components) || !Array.isArray(parsedResult.tools) || !Array.isArray(parsedResult.steps)) {
        throw new Error('API повернуло дані в неочікуваному форматі.');
    }

    return parsedResult;

  } catch (error) {
    console.error('Помилка Gemini API:', error);
    if (error instanceof SyntaxError) {
        throw new Error('Не вдалося розпарсити відповідь від API. Спробуйте ще раз.');
    }
    throw new Error('Не вдалося проаналізувати посібник. Спробуйте ще раз.');
  }
};