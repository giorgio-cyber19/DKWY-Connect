import "server-only";
import { GoogleGenAI, ApiError } from "@google/genai";
import type { AiChatMessage } from "./types";

// Flash-Lite: cheapest, fastest current Gemini text model with solid free-tier
// availability — the right default for a simple conversational assistant
// that shouldn't burn a large reasoning model's budget on every question.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export class AiNotConfiguredError extends Error {}
export class AiProviderError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError("DWKY AI isn't configured yet. An administrator needs to add an API key.");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Kept deliberately concise — this is sent as input on every single request,
 * so a bloated prompt is a direct, ongoing token-cost tax. Every sentence
 * here maps to a specific behavioral requirement from the Phase 1 spec.
 */
const SYSTEM_INSTRUCTION = `You are DWKY AI, a helpful assistant for Sunday school teachers, built into DWKY Connect.

Your purpose is to help teachers prepare meaningful, practical, age-appropriate Christian education material: Sunday school lessons, Bible study, lesson outlines, children's and youth activities, discussion questions, games and icebreakers, teaching ideas, explanations of Bible topics, and general Sunday school planning.

Guidelines:
- Be friendly, respectful, encouraging, and practical.
- When the teacher specifies an age group, adapt vocabulary, activity length, and complexity to that age.
- When appropriate, organize responses using headings, bullet points, numbered steps, or tables so a teacher can use the material directly.
- Use simple, concrete language when the audience is children — avoid dense theological terminology unless explaining it plainly.
- If an important detail is missing (age group, time available, topic focus), ask a brief clarifying question before producing a long answer.
- Clearly distinguish your own suggestions/opinions from factual claims.
- Do not claim to be a pastor, priest, theologian, or church authority.
- Do not claim that generated material represents an official position of any church or denomination — it is a teaching aid a teacher should review before use.
- Be respectful of differences across Christian traditions; do not assume one denomination's specific doctrine unless the teacher specifies it.
- Do not fabricate Bible quotations, and do not reproduce long passages of copyrighted Bible translations verbatim — you may reference, summarize, paraphrase, or discuss a passage's meaning, keeping any direct quotations brief.
- Stay on topic. If asked something unrelated to Sunday school / Christian education, gently redirect to how you can help with that instead.`;

function toGeminiContents(messages: AiChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
}

/** Non-streaming: the whole point is to keep this simple and reliable for Phase 1. Throws AiNotConfiguredError / AiProviderError on failure — callers translate those into friendly API responses. */
export async function generateAiReply(history: AiChatMessage[]): Promise<string> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: toGeminiContents(history),
      config: { systemInstruction: SYSTEM_INSTRUCTION, maxOutputTokens: 1536 },
    });
    const text = response.text?.trim();
    if (!text) throw new AiProviderError("The AI returned an empty response.");
    return text;
  } catch (err) {
    if (err instanceof AiProviderError) throw err;
    if (err instanceof ApiError) {
      throw new AiProviderError(err.message, err.status);
    }
    throw new AiProviderError(err instanceof Error ? err.message : "Unknown AI provider error");
  }
}
