import { useState, useRef, useEffect } from 'react';
import { Bot, Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Reveal, SectionHeading } from '../components/ui';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatbotPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.reply) throw new Error('No reply received');

      setMessages((p) => [...p, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setMessages((p) => [...p, { role: 'assistant', content: `Error: ${err?.message || 'Request failed'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-pad relative min-h-screen pt-28">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="AI Assistant"
          title={<>FoodLink <span className="gradient-text">AI Chatbot</span></>}
          subtitle="Your 24/7 assistant for food donation, NGO matching, volunteering, and platform guidance."
        />

        <Reveal className="mt-10">
          <div className="mx-auto flex h-[600px] max-w-2xl flex-col overflow-hidden rounded-3xl glass shadow-card">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-ink-soft/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">FoodLink AI Assistant</div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulseGlow" />
                    Online
                  </div>
                </div>
              </div>
              <button onClick={() => navigate('/')} className="flex items-center gap-2 rounded-xl glass-soft px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : 'glass-soft text-slate-200'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl glass-soft px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-transform hover:scale-105 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
