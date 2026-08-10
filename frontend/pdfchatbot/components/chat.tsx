"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong reaching the server. Is the backend running on port 5000?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium text-foreground">PDF ChatBot</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask a question about the PDF to get started.
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the PDF..."
          disabled={isLoading}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
