import { Citation } from './types';

export interface ChatResponse {
  reply: string;
  citations: Citation[];
  model: string;
  searchGrounded: boolean;
}

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onDone: (data: { fullText: string; citations: Citation[]; searchGrounded: boolean }) => void;
  onError: (error: string) => void;
}

export async function checkServerHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Server health check failed');
  return res.json();
}

export async function getToolsCatalog() {
  const res = await fetch('/api/tools');
  if (!res.ok) throw new Error('Failed to fetch tools catalog');
  return res.json();
}

export async function sendChatMessage(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  useSearch = false,
  projectInstructions = ''
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory,
      useSearch,
      projectInstructions,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export async function streamChatMessage(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  useSearch = false,
  projectInstructions = '',
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
) {
  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory,
        useSearch,
        projectInstructions,
      }),
      signal,
    });

    if (!res.ok) {
      console.warn(`Stream endpoint returned status ${res.status}. Falling back to standard chat API...`);
      try {
        const fallback = await sendChatMessage(message, conversationHistory, useSearch, projectInstructions);
        callbacks.onDone({
          fullText: fallback.reply,
          citations: fallback.citations || [],
          searchGrounded: fallback.searchGrounded,
        });
        return;
      } catch (fallbackErr: any) {
        throw new Error(fallbackErr.message || `Request failed with status ${res.status}`);
      }
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('ReadableStream not supported by browser.');

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const eventMatch = line.match(/^event:\s*(.+)$/m);
        const dataMatch = line.match(/^data:\s*(.+)$/m);

        const event = eventMatch ? eventMatch[1].trim() : 'message';
        let data: any = {};
        if (dataMatch) {
          try {
            data = JSON.parse(dataMatch[1].trim());
          } catch (e) {
            data = { raw: dataMatch[1] };
          }
        }

        if (event === 'token' && data.token) {
          callbacks.onToken(data.token);
        } else if (event === 'done') {
          callbacks.onDone({
            fullText: data.fullText || '',
            citations: data.citations || [],
            searchGrounded: Boolean(data.searchGrounded),
          });
        } else if (event === 'error') {
          callbacks.onError(data.error || 'Stream error');
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Stream was aborted by user');
      return;
    }
    // Attempt fallback if network/stream fails
    try {
      console.warn('Stream failed or disconnected, falling back to standard /api/chat...');
      const fallback = await sendChatMessage(message, conversationHistory, useSearch, projectInstructions);
      callbacks.onDone({
        fullText: fallback.reply,
        citations: fallback.citations || [],
        searchGrounded: fallback.searchGrounded,
      });
    } catch {
      callbacks.onError(err.message || 'Stream communication failed');
    }
  }
}

export async function runAITool(
  toolId: string,
  prompt: string,
  options: {
    useSearch?: boolean;
    gradeLevel?: string;
    tone?: string;
    targetRole?: string;
  } = {}
) {
  const res = await fetch('/api/tools/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolId,
      prompt,
      options,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Tool execution failed: status ${res.status}`);
  }

  return res.json();
}
