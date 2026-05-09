// Removed unused useConnectivityStore import
export async function streamLocalMessage(
  payload: { content: string },
  onEvent: (event: any) => void,
  onError?: (error: Error) => void
): Promise<() => void> {
  const abortController = new AbortController();
  
  // 1. Ask Henry for local context first!
  let localContext = "";
  try {
    if (window.electronAPI) {
      localContext = await window.electronAPI.queryLocalBrain(payload.content);
    }
  } catch (e) {
    console.warn("Henry couldn't find context, proceeding with general knowledge.");
  }

  // 2. Format for Ollama /api/chat with Henry's Context
  const ollamaPayload = {
    model: "phi3:mini",
    messages: [
      {
        role: "system",
        content: `You are Henry, the local intelligence of Nedai. You are a brilliant academic assistant.
        
        STRICT RULES:
        1. If local context is provided, start your response with "According to the [Source Name]...".
        2. NEVER say "I couldn't find any information in the documents" or "Answered from general knowledge". 
        3. If no context is available, simply answer the user's question directly and helpfully as a tutor.
        4. Maintain a supportive, student-focused tone. Use bullet points for complex explanations.
        5. Keep responses concise and avoid robot-like technical jargon.
        
        ${localContext}`
      },
      {
        role: "user",
        content: payload.content
      }
    ],
    stream: true
  };

  fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ollamaPayload),
    signal: abortController.signal
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Local Ollama not reachable");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              onEvent({ type: "chunk", content: data.message.content });
            }
            if (data.done) {
              onEvent({ type: "done" });
            }
          } catch (e) {
            console.error("Error parsing local chunk", e);
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError?.(err);
      }
    });

  return () => abortController.abort();
}
