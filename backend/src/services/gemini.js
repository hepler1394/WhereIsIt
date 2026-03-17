import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️  Gemini API key not set — AI features disabled');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Get a Gemini model instance.
 * Uses Flash by default (250 RPD free), Pro for complex tasks (100 RPD free).
 */
export function getModel(variant = 'flash') {
  if (!genAI) return null;
  const modelName = variant === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Run a text-only inference with structured JSON output.
 * @param {string} systemPrompt - The agent's system instructions
 * @param {string} userPrompt - The specific task/query
 * @param {string} variant - 'flash' or 'pro'
 * @returns {object|null} Parsed JSON response or null on failure
 */
export async function inferJSON(systemPrompt, userPrompt, variant = 'flash') {
  const model = getModel(variant);
  if (!model) return null;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for consistency
      },
    });

    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error(`Gemini inference error (${variant}):`, err.message);
    return null;
  }
}

/**
 * Run multimodal inference (image + text) with structured JSON output.
 * Used for aisle sign photo processing, weekly ad parsing, etc.
 * @param {string} systemPrompt - The agent's system instructions
 * @param {string} userPrompt - The specific task/query
 * @param {Buffer} imageBuffer - Image data
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {object|null} Parsed JSON response or null on failure
 */
export async function inferWithImage(systemPrompt, userPrompt, imageBuffer, mimeType = 'image/jpeg') {
  const model = getModel('flash');
  if (!model) return null;

  try {
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }, imagePart] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error('Gemini vision inference error:', err.message);
    return null;
  }
}
