import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "@/lib/api-error";
import { env } from "@/utils/env";

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient() {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(500, "Gemini API key not configured");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  return geminiClient;
}

export const GEMINI_CHAT_MODEL = "gemini-2.5-flash";
