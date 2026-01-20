import { useState, useRef, useEffect } from 'react';
import {
  Send, Youtube, MessageSquare, Loader2, Sparkles,
  ArrowRight, Bot, User, Link2, RefreshCw, Zap, Play
} from 'lucide-react';
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
      setMessages([{ role: 'model', content: "Connection established. I've analyzed the visual and audio data. Awaiting queries." }]);
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
      setError("Transmission failed. Please retry.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-neutral-950 text-neutral-100 font-sans overflow-hidden">

      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-800/10 rounded-full blur-[120px] pointer-events-none" />

      <div className={cn(
        "relative flex flex-col transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] border-b md:border-b-0 md:border-r border-white/5 bg-neutral-900/50 backdrop-blur-sm",
        videoId ? "h-[35%] md:h-full md:w-1/2" : "h-full w-full justify-center items-center z-20"
      )}>

        {!videoId ? (
          <div className="w-full max-w-xl px-6 md:px-12 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">

            <div className="mb-8 relative group">
              <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
              <div className="relative w-24 h-24 bg-gradient-to-b from-neutral-800 to-neutral-950 rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl">
                <Youtube className="w-10 h-10 text-red-500" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Chat<span className="text-red-500">Tube</span>
            </h1>
            <p className="text-neutral-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Connect a video stream to initialize neural analysis and chat with the content in real-time.
            </p>

            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-900 rounded-2xl opacity-30 blur group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-neutral-900 border border-white/10 rounded-xl p-2 flex flex-col md:flex-row items-center gap-2 shadow-2xl">
                <div className="flex-1 w-full flex items-center px-4 h-14">
                  <Link2 className="w-5 h-5 text-neutral-500 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube URL..."
                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-neutral-600 h-full"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleIngest}
                  disabled={loading || !url}
                  className="w-full md:w-auto h-12 px-8 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] hover:shadow-[0_0_25px_-5px_rgba(220,38,38,0.7)]"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  <span>{loading ? "Analyzing..." : "Analyze"}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full relative bg-black group">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?theme=dark&autoplay=1&rel=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full object-contain md:object-cover"
            />

            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-white/80">LIVE CONNECTION</span>
              </div>

              <button
                onClick={() => { setVideoId(null); setUrl(''); setMessages([]); }}
                className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:bg-red-600 hover:border-red-600 transition-colors text-white"
                title="Disconnect"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "flex flex-col min-h-0 relative z-10 transition-all duration-700 bg-neutral-950/80",
        videoId ? "flex-1 md:w-1/2" : "hidden"
      )}>

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-neutral-900/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-neutral-200">AI Assistant</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Online
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 space-y-4">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm font-mono opacity-50">Awaiting your input...</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn(
              "flex gap-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/5 flex items-center justify-center shrink-0 shadow-lg">
                  <Bot className="w-4 h-4 text-red-500" />
                </div>
              )}

              <div className={cn(
                "px-5 py-3.5 text-sm leading-relaxed shadow-md max-w-[85%]",
                msg.role === 'user'
                  ? "bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl rounded-tr-sm border border-red-500/20"
                  : "bg-neutral-900/80 border border-white/10 text-neutral-300 rounded-2xl rounded-tl-sm backdrop-blur-sm"
              )}>
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-white prose-a:text-red-300">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-4 max-w-2xl mx-auto">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/5 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 px-4 h-10 bg-neutral-900/50 rounded-2xl rounded-tl-sm border border-white/5">
                <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        <div className="p-4 md:p-6 bg-neutral-900/80 backdrop-blur-xl border-t border-white/5 shrink-0">
          <div className="max-w-2xl mx-auto relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask a question about the video..."
              disabled={chatLoading}
              className="w-full bg-neutral-950 border border-white/10 rounded-xl px-5 py-4 pr-14 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm text-white placeholder:text-neutral-600 shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={chatLoading || !input.trim()}
              className="absolute right-2 p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-red-900/20"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-medium">Neural Link Active</span>
          </div>
        </div>

      </div>
    </div>
  );
}