// Chat Embedding Service for RAG-based chat memory
import prisma from "@/lib/prisma";
import { getEmbedding } from "@/lib/embedding";

export interface ChatEmbeddingData {
  userId: string;
  chatId: string;
  messageId: string;
  role: "user" | "assistant";
  content: string;
}

export interface RetrievedChatMessage {
  id: string;
  role: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Create embedding for a chat message and store in VDB
 */
export async function createChatEmbedding(data: ChatEmbeddingData): Promise<void> {
  try {
    // Generate embedding for the content
    const embedding = await getEmbedding(data.content);

    // Extract metadata for better retrieval
    const metadata = extractMessageMetadata(data.content, data.role);

    // Store in database
    await prisma.chatEmbedding.create({
      data: {
        userId: data.userId,
        chatId: data.chatId,
        messageId: data.messageId,
        role: data.role,
        content: data.content,
        embedding: embedding as any, // pgvector handles this
        metadata,
      },
    });

    console.log(`[chat-embedding] Created embedding for message ${data.messageId}`);
  } catch (error) {
    console.error("[chat-embedding] Failed to create embedding:", error);
    // Don't throw - we don't want to break chat if embedding fails
  }
}

/**
 * Retrieve semantically similar chat messages using vector search
 */
export async function retrieveRelevantChatMessages(
  userId: string,
  chatId: string,
  query: string,
  topK: number = 5
): Promise<RetrievedChatMessage[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await getEmbedding(query);

    // Perform vector similarity search
    // Using raw query because Prisma doesn't support vector operations directly
    const results = await prisma.$queryRaw<RetrievedChatMessage[]>`
      SELECT 
        ce.id,
        ce.role,
        ce.content,
        ce.metadata,
        1 - (ce.embedding <=> ${queryEmbedding}::vector) as score
      FROM chat_embeddings ce
      WHERE ce.user_id = ${userId}
        AND ce.chat_id = ${chatId}
        AND ce.role = 'assistant'  -- Only retrieve assistant responses for context
      ORDER BY ce.embedding <=> ${queryEmbedding}::vector
      LIMIT ${topK}
    `;

    return results;
  } catch (error) {
    console.error("[chat-embedding] Failed to retrieve messages:", error);
    return [];
  }
}

/**
 * Get recent chat messages (chronological)
 */
export async function getRecentChatMessages(
  chatId: string,
  limit: number = 5
): Promise<{ role: string; content: string }[]> {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages
    .reverse()
    .map((m) => ({ role: m.role.toLowerCase(), content: m.content }));
}

/**
 * Extract metadata from message for better retrieval
 */
function extractMessageMetadata(
  content: string,
  role: string
): Record<string, any> {
  const metadata: Record<string, any> = {
    role,
    length: content.length,
  };

  // Detect if message contains code
  if (content.includes("```") || content.includes("`")) {
    metadata.hasCode = true;
  }

  // Detect if message contains math/LaTeX
  if (content.includes("$") || content.includes("\\(") || content.includes("\\[")) {
    metadata.hasMath = true;
  }

  // Extract potential topics (simple keyword detection)
  const topicKeywords = [
    "math", "physics", "chemistry", "biology", "history",
    "programming", "calculus", "algebra", "statistics",
    "stress", "exam", "test", "homework", "assignment",
    "explain", "help", "confused", "understand"
  ];

  const detectedTopics = topicKeywords.filter(keyword =>
    content.toLowerCase().includes(keyword)
  );

  if (detectedTopics.length > 0) {
    metadata.topics = detectedTopics;
  }

  return metadata;
}

/**
 * Build hybrid context: recent messages + semantically relevant messages
 */
export async function buildHybridChatContext(
  userId: string,
  chatId: string,
  currentQuery: string,
  recentLimit: number = 5,
  semanticLimit: number = 3
): Promise<{ role: string; content: string }[]> {
  // Get recent messages (chronological)
  const recentMessages = await getRecentChatMessages(chatId, recentLimit);

  // Get semantically relevant messages
  const relevantMessages = await retrieveRelevantChatMessages(
    userId,
    chatId,
    currentQuery,
    semanticLimit
  );

  // Combine: recent first, then relevant (avoiding duplicates)
  const seenContent = new Set(recentMessages.map(m => m.content));
  const combined = [...recentMessages];

  for (const msg of relevantMessages) {
    if (!seenContent.has(msg.content)) {
      combined.push({ role: msg.role, content: msg.content });
      seenContent.add(msg.content);
    }
  }

  return combined;
}
