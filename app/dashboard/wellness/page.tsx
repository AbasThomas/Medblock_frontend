"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle,
  HeartPulse,
  Loader2,
  Phone,
  Send,
  Smile,
} from "lucide-react";
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
  const supabase = createClient();

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
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <HeartPulse className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Wellness Check-In</p>
            <p className="text-xs text-muted-foreground">AI-powered support · Private & confidential</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>

        {/* Mood selector */}
        <div className="border-b px-5 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">How are you feeling today?</p>
          <div className="flex gap-2">
            {MOODS.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setMood(id)}
                title={label}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border px-2.5 py-1.5 text-xs transition-colors",
                  mood === id ? "border-primary bg-accent" : "hover:bg-muted",
                )}
              >
                <span className="text-base">{emoji}</span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {chatLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Smile className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Hi! I'm here to support you.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share how you're feeling and I'll offer practical, caring support.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {QUICK_MESSAGES.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => void sendMessage(msg)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 self-end">
                    <HeartPulse className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      msg.role === "user" ? "text-white/60" : "text-muted-foreground",
                    )}
                  >
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-muted-foreground/40"
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
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Share how you're feeling…"
              disabled={loading}
              className="flex-1 rounded-xl border bg-muted/40 px-4 py-2.5 text-sm outline-none ring-primary/50 transition-shadow focus:ring-2 disabled:opacity-60"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">
        {/* Crisis resources */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Crisis Support
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            If you're in immediate distress, please reach out:
          </p>
          <div className="mt-3 space-y-2">
            {HOTLINES.map(({ name, number }) => (
              <div key={name} className="rounded-xl border p-2.5">
                <p className="text-xs font-medium">{name}</p>
                <a
                  href={`tel:${number}`}
                  className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" /> {number}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Quick Tips</p>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            {[
              "Take a 5-minute break every 45 minutes of study.",
              "Drink water and step outside for fresh air.",
              "Break big tasks into small achievable steps.",
              "Connect with a classmate — you're not alone.",
              "Sleep is essential for memory and focus.",
            ].map((tip) => (
              <div key={tip} className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div className="rounded-2xl border border-dashed p-4 text-center">
          <p className="text-xs font-medium">Your conversations are private</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Only you can see your chat history. We never share your wellness data.
          </p>
        </div>
      </div>
    </div>
  );
}
