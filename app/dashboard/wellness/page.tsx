"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Alert01Icon as AlertTriangle,
  Activity01Icon as HeartPulse,
  TelephoneIcon as Phone,
  SentIcon as Send,
} from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getChatMessages, saveChatMessage } from "@/lib/supabase/queries";
import { timeAgo, cn } from "@/lib/utils";

type Message = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  mood?: string;
  created_at: string;
};

const MOODS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "neutral", label: "Neutral", emoji: "😐" },
  { id: "anxious", label: "Anxious", emoji: "😟" },
  { id: "stressed", label: "Stressed", emoji: "😩" },
  { id: "sad", label: "Sad", emoji: "😔" },
];

const HOTLINES = [
  { name: "Lagos Suicide Hotline", number: "+234 806 210 6493" },
  { name: "NIMHANS Crisis Line", number: "+234 809 111 6262" },
  { name: "Mentally Aware Nigeria", number: "+234 808 432 9889" },
];

const QUICK_MESSAGES = [
  "I'm stressed about my exams",
  "I'm having trouble focusing",
  "I feel overwhelmed with deadlines",
  "I need help managing my time",
];

export default function WellnessPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const data = await getChatMessages(supabase, user.id, 50);
      setMessages(data as Message[]);
    } catch {
      // Table may not exist yet
    } finally {
      setChatLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime subscription for chat
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("chat-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages", filter: `user_id=eq.${user.id}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          },
        )
        .subscribe();
    };

    void subscribe();
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, [supabase]);

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;

    setInput("");
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      // Save user message
      const userMsg = await saveChatMessage(supabase, {
        user_id: user.id,
        role: "user",
        content: messageText,
        mood,
      });
      setMessages((prev) => [...prev, userMsg as Message]);

      // Get AI response
      const res = await fetch("/api/ai/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, mood }),
      });
      const data = await res.json() as { urgent?: boolean; response?: string; followUps?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");

      const responseContent = [
        data.response,
        ...(data.followUps ?? []).map((q: string) => `• ${q}`),
      ]
        .filter(Boolean)
        .join("\n\n");

      const assistantMsg = await saveChatMessage(supabase, {
        user_id: user.id,
        role: "assistant",
        content: responseContent,
      });
      setMessages((prev) => [...prev, assistantMsg as Message]);

      if (data.urgent) {
        toast.warning("Urgent support: Please reach out to a counsellor.", { duration: 8000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A8F6A]/5 to-transparent pointer-events-none"></div>
        {/* Chat header */}
        <div className="flex items-center gap-4 border-b border-white/5 px-6 py-5 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A8F6A]/10 border border-[#0A8F6A]/20">
            <HeartPulse size={24} className="text-[#0A8F6A]" />
          </div>
          <div>
            <p className="text-lg font-medium tracking-tight text-white">Wellness Support</p>
            <p className="text-xs text-neutral-500 font-light">Private AI-guided check-ins for student wellbeing.</p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-3 py-1.5 text-[10px] font-bold text-[#0A8F6A] uppercase tracking-widest shadow-[0_0_10px_rgba(10,143,106,0.1)]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#0A8F6A] animate-pulse" />
            Operational
          </div>
        </div>

        {/* Mood selector */}
        <div className="border-b border-white/5 px-6 py-4 relative z-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Current Frequency</p>
          <div className="flex gap-3">
            {MOODS.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setMood(id)}
                title={label}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-4 py-2 text-xs transition-all duration-300",
                  mood === id
                    ? "border-[#0A8F6A] bg-[#0A8F6A]/10 text-white shadow-[0_0_15px_rgba(10,143,106,0.2)]"
                    : "border-white/5 bg-white/5 text-neutral-500 hover:text-white hover:border-white/10",
                )}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 relative z-10 custom-scrollbar">
          {chatLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0A8F6A]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#0A8F6A]/10 flex items-center justify-center mb-6">
                <HeartPulse size={40} className="text-[#0A8F6A] animate-pulse" />
              </div>
              <p className="text-xl font-medium tracking-tight text-white mb-2">
                Support Session Ready
              </p>
              <p className="text-sm text-neutral-500 font-light max-w-xs leading-relaxed">
                Share how you are feeling to receive practical support guidance.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {QUICK_MESSAGES.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => void sendMessage(msg)}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:border-[#0A8F6A] transition-all"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex items-end gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-lg",
                  msg.role === "user" ? "bg-white/10 border-white/20" : "bg-[#0A8F6A]/20 border-[#0A8F6A]/30"
                )}>
                  {msg.role === "assistant" ? <HeartPulse size={16} className="text-[#0A8F6A]" /> : <div className="h-4 w-4 rounded-full bg-white/30" />}
                </div>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-5 py-3.5 text-sm font-light leading-relaxed shadow-2xl",
                    msg.role === "user"
                      ? "rounded-br-sm bg-white/10 border border-white/10 text-white"
                      : "rounded-bl-sm bg-black/40 border border-[#0A8F6A]/20 text-neutral-200 backdrop-blur-md",
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className={cn("h-px w-4", msg.role === "user" ? "bg-white/20" : "bg-[#0A8F6A]/30")}></div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                      {timeAgo(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-end gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20">
                <HeartPulse size={16} className="text-[#0A8F6A]" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-black/40 border border-[#0A8F6A]/10 px-6 py-4 backdrop-blur-md">
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-[#0A8F6A]/40"
                      style={{ animation: `pulse-dot 1.5s ease-in-out ${i * 0.3}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 px-6 py-5 relative z-10 bg-black/20">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Type how you are feeling..."
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white outline-none focus:border-[#0A8F6A]/50 transition-colors placeholder:text-neutral-600 disabled:opacity-60"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A8F6A] text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden w-72 shrink-0 flex-col gap-6 lg:flex">
        {/* Crisis resources */}
        <div className="glass-panel rounded-2xl p-6 border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-red-500/5 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-red-500 mb-4 relative z-10">
            <AlertTriangle size={16} className="shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
            Priority Support
          </div>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mb-6 relative z-10">
            If you are in immediate distress, please contact one of these local support services:
          </p>
          <div className="space-y-3 relative z-10">
            {HOTLINES.map(({ name, number }) => (
              <div key={name} className="rounded-xl border border-white/5 bg-white/5 p-4 hover:border-red-500/30 transition-all group">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">{name}</p>
                <a
                  href={`tel:${number}`}
                  className="flex items-center gap-2 text-sm font-medium text-white group-hover:text-red-400 transition-colors"
                >
                  <Phone size={14} className="text-red-500" /> {number}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass-panel rounded-2xl p-6 border-white/5 shadow-2xl relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A] mb-6">Wellness Practices</p>
          <div className="space-y-4 text-xs text-neutral-400 font-light leading-relaxed">
            {[
              "Implement 45/5 tactical study intervals.",
              "Hydrate and take short movement breaks.",
              "Break large tasks into small milestones.",
              "Coordinate with peers on shared coursework.",
              "Protect your sleep and recovery schedule.",
            ].map((tip) => (
              <div key={tip} className="flex gap-3 items-start">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A8F6A] shadow-[0_0_8px_rgba(10,143,106,0.6)]" />
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2">Secure Channel</p>
          <p className="text-[10px] text-neutral-600 font-light leading-relaxed">
            End-to-end data isolation active. Conversations are scoped to your account only.
          </p>
        </div>
      </div>
    </div>
  );
}
