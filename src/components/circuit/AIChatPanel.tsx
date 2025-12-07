import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ActionCard from "./ActionCard";

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  is_archived: boolean;
  toolCalls?: ToolCall[];
  toolCallsHandled?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/circuit-chat`;
const PAGE_SIZE = 20;

// Parse tool calls from message content
function parseToolCalls(content: string): { toolCalls: ToolCall[]; cleanContent: string } {
  const toolCallMatch = content.match(/__TOOL_CALLS__(.*?)__END_TOOL_CALLS__/s);
  if (toolCallMatch) {
    try {
      const toolCalls = JSON.parse(toolCallMatch[1]) as ToolCall[];
      const cleanContent = content.replace(/__TOOL_CALLS__.*?__END_TOOL_CALLS__/s, "").trim();
      return { toolCalls, cleanContent };
    } catch {
      return { toolCalls: [], cleanContent: content };
    }
  }
  return { toolCalls: [], cleanContent: content };
}

interface AIChatPanelProps {
  roundId?: string;
}

export default function AIChatPanel({ roundId }: AIChatPanelProps) {
  const { toast } = useToast();
  const { user, session } = useFounderAuth();
  const queryClient = useQueryClient();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use React Query for message caching - persists across navigations, filtered by round
  const { data: dbMessages = [], isLoading: isLoadingMessages, isFetched } = useQuery({
    queryKey: ["circuit-chat-messages", user?.id, roundId],
    queryFn: async () => {
      console.log("[AIChatPanel] Fetching messages from DB for user:", user?.id, "round:", roundId);
      const start = performance.now();
      
      let query = supabase
        .from("circuit_chat_messages")
        .select("*")
        .eq("user_id", user!.id);
      
      // Filter by round if available
      if (roundId) {
        query = query.eq("round_id", roundId);
      } else {
        query = query.is("round_id", null);
      }
      
      const { data, error } = await query
        .order("created_at", { ascending: true })
        .limit(100); // Get last 100 messages

      console.log(`[AIChatPanel] DB query took ${(performance.now() - start).toFixed(0)}ms, got ${data?.length || 0} messages`);
      
      if (error) throw error;
      
      return (data || []).map(m => {
        const { toolCalls, cleanContent } = parseToolCalls(m.content);
        return {
          ...m,
          role: m.role as "user" | "assistant",
          content: cleanContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          toolCallsHandled: true,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - don't refetch on every mount
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  // Merge DB messages with local streaming messages
  const messages = [...dbMessages, ...localMessages];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveUserMessage = async (content: string): Promise<Message | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("circuit_chat_messages")
        .insert({
          user_id: user.id,
          role: "user",
          content,
          round_id: roundId || null,
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

  const streamChat = async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        roundId: roundId || null,
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
    let toolCalls: ToolCall[] = [];
    let currentToolCall: { id?: string; name?: string; arguments?: string } = {};

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
          const delta = parsed.choices?.[0]?.delta;
          
          // Handle content
          const content = delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setLocalMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.id.startsWith("temp-")) {
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
                toolCallsHandled: false,
              }];
            });
          }
          
          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (toolCall.id) {
                if (currentToolCall.id) {
                  toolCalls.push({
                    id: currentToolCall.id,
                    name: currentToolCall.name || "",
                    arguments: currentToolCall.arguments || ""
                  });
                }
                currentToolCall = {
                  id: toolCall.id,
                  name: toolCall.function?.name || "",
                  arguments: toolCall.function?.arguments || ""
                };
              } else if (toolCall.function) {
                if (toolCall.function.name) {
                  currentToolCall.name = (currentToolCall.name || "") + toolCall.function.name;
                }
                if (toolCall.function.arguments) {
                  currentToolCall.arguments = (currentToolCall.arguments || "") + toolCall.function.arguments;
                }
              }
            }
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Process any remaining buffer
    if (textBuffer.trim()) {
      const line = textBuffer.trim();
      if (line.startsWith("data: ") && line.slice(6).trim() !== "[DONE]") {
        try {
          const parsed = JSON.parse(line.slice(6).trim());
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
          }
        } catch {
          // Ignore final parse error
        }
      }
    }

    // Push the last tool call
    if (currentToolCall.id) {
      toolCalls.push({
        id: currentToolCall.id,
        name: currentToolCall.name || "",
        arguments: currentToolCall.arguments || ""
      });
    }

    return { content: assistantContent, toolCalls };
  };

  const handleToolCallComplete = (messageId: string, toolCallId: string) => {
    setLocalMessages(prev => prev.map(m => {
      if (m.id === messageId && m.toolCalls) {
        const remainingCalls = m.toolCalls.filter(tc => tc.id !== toolCallId);
        return {
          ...m,
          toolCalls: remainingCalls.length > 0 ? remainingCalls : undefined,
          toolCallsHandled: true,
        };
      }
      return m;
    }));
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

    // Invalidate query to include new message
    await queryClient.invalidateQueries({ queryKey: ["circuit-chat-messages", user.id, roundId] });

    try {
      const allMessages = [...messages, savedUserMessage];
      const { content, toolCalls } = await streamChat(allMessages);
      
      // Update the temp message with final content and tool calls
      setLocalMessages(prev => prev.map(m => 
        m.id.startsWith("temp-") ? {
          ...m,
          id: "final-" + crypto.randomUUID(),
          content,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          toolCallsHandled: false,
        } : m
      ));

      // Invalidate to get the saved assistant message from DB
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["circuit-chat-messages", user.id, roundId] });
        setLocalMessages([]); // Clear local messages once DB is updated
      }, 500);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
      setLocalMessages(prev => prev.filter(m => !m.id.startsWith("temp-")));
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

  // Show sign-in prompt if no user
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

  const showLoading = isLoadingMessages && !isFetched;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea 
        className="flex-1 p-4" 
        ref={scrollRef}
      >
        {showLoading ? (
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
              Ask me to add investors, create memos, or help with your fundraise.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const stale = isStale(message.created_at);
              return (
                <div key={message.id} className={stale ? "opacity-50" : ""}>
                  <div
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
                  
                  {/* Tool call action cards */}
                  {message.toolCalls && !message.toolCallsHandled && (
                    <div className="mt-2 space-y-2 ml-0">
                      {message.toolCalls.map((toolCall) => (
                        <ActionCard
                          key={toolCall.id}
                          toolCall={toolCall}
                          onComplete={() => handleToolCallComplete(message.id, toolCall.id)}
                        />
                      ))}
                    </div>
                  )}
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
            placeholder="Ask Circuit to add investors, create memos..."
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