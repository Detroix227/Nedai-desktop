import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/utils/env";
import { ApiError } from "@/lib/api-error";

const LOCAL_EMBEDDING_MODEL = "Xenova/bge-small-en-v1.5";
const GEMINI_EMBEDDING_MODEL = "text-embedding-004";

class EmbeddingServiceImpl {
  private localPipeline: Promise<any> | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.EMBEDDING_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  private async getLocalPipeline() {
    if (!this.localPipeline) {
      this.localPipeline = import("@xenova/transformers").then(
        async ({ pipeline }) =>
          pipeline("feature-extraction", LOCAL_EMBEDDING_MODEL),
      );
    }

    return this.localPipeline;
  }

  private getGeminiClient(): GoogleGenerativeAI {
    if (!this.geminiClient) {
      if (!env.GEMINI_API_KEY) {
        throw new ApiError(500, "Gemini API key not configured");
      }
      this.geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return this.geminiClient;
  }

  public async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Use Gemini API if configured
    if (env.EMBEDDING_PROVIDER === "gemini") {
      return this.embedWithGemini(texts);
    }

    // Fall back to local model
    const extractor = await this.getLocalPipeline();
    const result = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });

    return result.tolist();
  }

  private async embedWithGemini(texts: string[]): Promise<number[][]> {
    const client = this.getGeminiClient();
    const model = client.getGenerativeModel(
      { model: GEMINI_EMBEDDING_MODEL },
      { apiVersion: "v1" },
    );

    try {
      const results: number[][] = [];

      // Gemini supports batching but let's do one at a time for simplicity
      for (const text of texts) {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        results.push(embedding);
      }

      return results;
    } catch (error: any) {
      console.error("[embedding:gemini] failed", error?.message ?? error);
      throw new ApiError(502, `Failed to generate embeddings with Gemini: ${error?.message ?? "Unknown error"}`);
    }
  }

  public async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([text]);
    return embedding ?? [];
  }
}

const EmbeddingService = new EmbeddingServiceImpl();

export default EmbeddingService;
