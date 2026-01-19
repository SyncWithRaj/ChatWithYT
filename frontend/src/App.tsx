
import { useState, useRef, useEffect } from 'react';
import { Send, Youtube, MessageSquare, Loader2, Sparkles, StopCircle, ArrowRight, PlayCircle, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  const handleIngest = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Failed to process video');

      setVideoId(data.video_id);
      setMessages([{ role: 'model', content: "I've watched the video! Ask me anything about it." }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !videoId) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          video_id: videoId,
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'model', content: data.response }]);

    } catch (err) {
      console.error(err);
      setError("Failed to get response. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">

      {/* Left Sidebar / Video Info */}
      <div className="w-[400px] flex flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl relative z-10">

        {/* Header */}
        <div className="p-6 border-b border-border/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/20">
            <Youtube className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">ChatWithYT</h1>
            <p className="text-xs text-muted-foreground font-medium">AI Video Assistant</p>
          </div>
        </div>

        {/* Input & Video Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Video Source</label>
              <div className="relative group">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste YouTube URL..."
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all placeholder:text-muted-foreground/50 hover:bg-secondary/80"
                  disabled={loading || !!videoId}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
              </div>
            </div>

            {!videoId && (
              <button
                onClick={handleIngest}
                disabled={loading || !url}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Analyzing Video...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-primary-foreground/80" fill="currentColor" />
                    <span>Start Chatting</span>
                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                <StopCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {videoId && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-2xl overflow-hidden border border-border/40 shadow-2xl shadow-black/50 bg-black aspect-video relative group">
                <div className="absolute inset-0 w-full h-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="relative z-0"
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Video Connected
                </div>
                <button
                  onClick={() => { setVideoId(null); setUrl(''); setMessages([]); }}
                  className="text-xs text-muted-foreground hover:text-white transition-colors underline decoration-border hover:decoration-white underline-offset-4"
                >
                  Change Video
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground/60">Powered by Gemini 1.5 Flash & Qdrant</p>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-background/50 relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground/30 animate-in fade-in duration-1000">
                <div className="w-20 h-20 rounded-3xl bg-secondary/50 flex items-center justify-center mb-6 ring-1 ring-white/5">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-2">Ready to chat?</h3>
                <p className="text-sm max-w-xs text-center">Load a video on the left to start asking questions about its content.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={cn(
                "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={cn(
                  "max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border/50 text-card-foreground rounded-tl-sm shadow-black/5"
                )}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center shrink-0 mt-1">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-border/40 bg-background/80 backdrop-blur-md relative z-10">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={videoId ? "Ask a question about the video..." : "Connect a video first..."}
              disabled={!videoId || chatLoading}
              className="w-full bg-secondary/50 border border-border/50 rounded-2xl pl-6 pr-14 py-4 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all shadow-lg shadow-black/5 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/50 text-base"
            />
            <div className="absolute right-2 top-2 bottom-2">
              <button
                onClick={handleSend}
                disabled={!videoId || chatLoading || !input.trim()}
                className="h-full aspect-square bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center transition-all disabled:opacity-0 disabled:scale-90 shadow-md shadow-primary/25 hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/40 mt-3">
            AI may display inaccurate info, including about people, so double-check its responses.
          </p>
        </div>
      </div>
    </div>
  );
}
