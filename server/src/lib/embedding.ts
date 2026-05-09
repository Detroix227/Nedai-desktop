import EmbeddingService from "@/api/v1/services/embedding.service";

export const getEmbedding = (text: string) => EmbeddingService.embedQuery(text);