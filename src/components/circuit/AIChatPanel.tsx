import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  is_archived: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/circuit-chat`;
const PAGE_SIZE = 20;

export default function AIChatPanel() {
  const { toast } = useToast();
  const { user, session } = useFounderAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load initial messages
  const loadMessages = useCallback(async (loadMore = false) => {
    if (!user) return;
    
    if (loadMore) {
      setIsLoadingMore(true);
    }

    try {
      const oldestMessage = loadMore && messages.length > 0 
        ? messages[0] 
        : null;

      let query = supabase
        .from("circuit_chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (oldestMessage) {
        query = query.lt("created_at", oldestMessage.created_at);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Reverse to get chronological order and cast role type
        const newMessages: Message[] = data.reverse().map(m => ({
          ...m,
          role: m.role as "user" | "assistant",
        }));
        
        if (loadMore) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }
        
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoadingMore(false);
      setInitialLoadDone(true);
    }
  }, [user, messages]);

  // Initial load
  useEffect(() => {
    if (user && !initialLoadDone) {
      loadMessages();
    }
  }, [user, initialLoadDone, loadMessages]);

  // Auto-scroll to bottom on new messages (only for new messages, not when loading more)
  useEffect(() => {
    if (scrollRef.current && !isLoadingMore) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoadingMore]);

  // Handle scroll for loading more
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop === 0 && hasMore && !isLoadingMore && initialLoadDone) {
      loadMessages(true);
    }
  }, [hasMore, isLoadingMore, initialLoadDone, loadMessages]);

  const saveUserMessage = async (content: string): Promise<Message | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("circuit_chat_messages")
        .insert({
          user_id: user.id,
          role: "user",
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data ? { ...data, role: data.role as "user" | "assistant" } : null;
    } catch (error) {
      console.error("Error saving message:", error);
      return null;
    }
  };

  const saveAssistantMessage = async (content: string): Promise<Message | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("circuit_chat_messages")
        .insert({
          user_id: user.id,
          role: "assistant",
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data ? { ...data, role: data.role as "user" | "assistant" } : null;
    } catch (error) {
      console.error("Error saving assistant message:", error);
      return null;
    }
  };

  const streamChat = async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${resp.status}`);
    }

    if (!resp.body) {
      throw new Error("No response body");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && !last.id.startsWith("temp-")) {
                // Update the streaming message
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { 
                id: "temp-" + crypto.randomUUID(), 
                role: "assistant", 
                content: assistantContent,
                created_at: new Date().toISOString(),
                is_archived: false,
              }];
            });
          }
        } catch {
          // Incomplete JSON, wait for more data
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userContent = input.trim();
    setInput("");
    setIsLoading(true);

    // Save user message to DB first
    const savedUserMessage = await saveUserMessage(userContent);
    
    if (!savedUserMessage) {
      toast({
        title: "Error",
        description: "Failed to save message. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Add to local state
    const newMessages = [...messages, savedUserMessage];
    setMessages(newMessages);

    try {
      const assistantContent = await streamChat(newMessages);
      
      // Save assistant message to DB
      const savedAssistantMessage = await saveAssistantMessage(assistantContent);
      
      if (savedAssistantMessage) {
        // Replace temp message with saved one
        setMessages(prev => prev.map(m => 
          m.id.startsWith("temp-") ? savedAssistantMessage : m
        ));
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
      // Keep user message but remove failed assistant message
      setMessages(prev => prev.filter(m => !m.id.startsWith("temp-")));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Determine if a message is "stale" (older than 24 hours)
  const isStale = (createdAt: string) => {
    const messageDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-medium mb-1">Circuit</p>
        <p className="text-xs text-muted-foreground">
          Sign in to chat with Circuit
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea 
        className="flex-1 p-4" 
        ref={scrollRef}
        onScrollCapture={handleScroll}
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {!initialLoadDone ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Circuit</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Ask me about your fundraise, get help with memos, or explore fundraising best practices.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const stale = isStale(message.created_at);
              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} ${stale ? "opacity-50" : ""}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Circuit..."
            rows={2}
            className="resize-none pr-10 text-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1 h-7 w-7"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
