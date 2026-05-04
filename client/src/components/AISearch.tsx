import { useState, useRef, useEffect } from 'react';
import { FilterState } from '../types';

interface Props {
  listingType: 'rent' | 'sale';
  onFiltersApplied: (filters: Partial<FilterState>) => void;
  resultCount: number | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function stripFilters(text: string): string {
  return text.replace(/<FILTERS>[\s\S]*?<\/FILTERS>/g, '').trim();
}

export default function AISearch({ listingType, onFiltersApplied, resultCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingResultCheck = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (!pendingResultCheck.current || resultCount === null) return;
    if (resultCount === 0) {
      pendingResultCheck.current = false;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I couldn't find any properties matching those criteria. Try adjusting the price range, location, or removing some filters." },
      ]);
    } else {
      pendingResultCheck.current = false;
    }
  }, [resultCount]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setStreaming(true);

    const history = nextMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
      content: m.content,
    }));

    let accumulated = '';

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, listingType }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;

          const event = JSON.parse(raw) as { type: string; content: unknown };

          if (event.type === 'text') {
            accumulated += event.content as string;
            const visible = stripFilters(accumulated);
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: visible },
            ]);
          } else if (event.type === 'filters') {
            const f = event.content as Record<string, unknown>;
            const merged: Partial<FilterState> = {};
            if (typeof f.city === 'string') merged.city = f.city;
            if (Array.isArray(f.districts)) merged.districts = f.districts as string[];
            if (Array.isArray(f.neighborhoods)) merged.neighborhoods = f.neighborhoods as string[];
            if (typeof f.minPrice === 'number') merged.minPrice = String(f.minPrice);
            if (typeof f.maxPrice === 'number') merged.maxPrice = String(f.maxPrice);
            if (typeof f.minRooms === 'number') merged.minRooms = String(f.minRooms);
            if (typeof f.minArea === 'number') merged.minArea = String(f.minArea);
            if (f.hasElevator === true) merged.hasElevator = true;
            if (Array.isArray(f.selectedExtras)) merged.selectedExtras = f.selectedExtras as string[];
            onFiltersApplied(merged);
            pendingResultCheck.current = true;
          } else if (event.type === 'error') {
            setError(event.content as string);
          }
        }
      }
    } catch {
      setError('Failed to connect to AI search.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="ai-chat">
      {messages.length === 0 ? (
        <p className="ai-chat-empty">Ask anything — "cheap 2-bed near Gràcia", "spacious flat with parking in Madrid"…</p>
      ) : (
        <div className="ai-chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`ai-chat-bubble ai-chat-bubble-${m.role}`}>
              <span>{m.content}</span>
              {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                <span className="ai-cursor" />
              )}
            </div>
          ))}
          {error && <p className="ai-error ai-chat-error">{error}</p>}
          <div ref={bottomRef} />
        </div>
      )}
      <form className="ai-chat-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="ai-search-input"
          placeholder={streaming ? 'Waiting for response…' : 'Refine your search or ask a follow-up…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
        />
        <button className="ai-search-btn" type="submit" disabled={streaming || !input.trim()}>
          {streaming ? <span className="ai-spinner" /> : 'Send'}
        </button>
      </form>
    </div>
  );
}
