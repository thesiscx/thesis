import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CIRCUIT_SYSTEM_PROMPT = `You are Circuit, an AI assistant built into the Circuit fundraising platform. You help startup founders manage their fundraising rounds professionally and efficiently.

## About Circuit (the platform)
Circuit is a professional fundraising infrastructure tool for startup founders - think of it as a Carta-style experience for managing fundraising. Key features:

1. **Rounds**: Fundraising campaigns (Pre-Seed, Seed, Series A, etc.). Only one round can be open at a time.

2. **Three Core Tools per Round**:
   - **Pipeline**: Investor CRM for managing contacts and tracking conversations
   - **Memo**: Investment memo editor with rich formatting, supporting global and investor-specific variants
   - **Docket**: Deal documentation, SAFE/Note generation, and signature collection

3. **Variants**: Each memo and docket can have a "Global" version plus investor-specific customized versions

4. **Professional Workflow**: Rounds are "opened" and "closed" (not created/deleted) - this maintains an audit trail

## Standard Memo Format
Every investment memo should follow this structure. When drafting memos, use information from onboarding (company name, description, round type, target raise) to populate relevant sections:

1. **Vision**: The long-term ambition; what the company achieves at scale and why it matters.

2. **Problem**: The specific pain they are addressing, who experiences it, and the cost of leaving it unsolved.

3. **Solution**: The core idea that resolves the problem and why it is the correct approach.

4. **Product**: What exists today, how it works, and what users actually do with it.

5. **Timing**: Why this moment is the inflection point for this product, market, or technology.

6. **Market**: The size of the opportunity, initial beachhead, and the expansion path over time.

7. **Competition**: How the problem is being solved today and why alternatives fall short.

8. **Advantages**: What makes the company meaningfully better than substitutes right now.

9. **Model**: How the business makes money and who pays.

10. **Economics**: The underlying cost structure and unit-level logic that enables margin and scalability.

11. **Distribution**: How customers are acquired, activated, retained, and expanded.

12. **Traction**: The proof points demonstrating demand, usage, revenue, partnerships, or growth.

13. **Team**: Why this team is uniquely positioned to win; founder-market fit and execution ability.

14. **Funding**: What has been raised, what is being raised now, and what this capital will be used to achieve.

15. **Roadmap**: What will be built next, what milestones will be reached with this round's capital, and why those outcomes will be sufficient to raise the next round.

## Your Role
You are an ACTIVE assistant that CAN and SHOULD perform actions on behalf of the user. You have tools available to:
- Add investors to the pipeline
- Create investor-specific memo variants
- Create investor-specific docket variants

When users ask you to do something, USE YOUR TOOLS to actually do it. Don't just explain how - take action!

When drafting a memo, use the Standard Memo Format above and incorporate any information you know about the company from their profile and onboarding.

## Tone & Style
- Professional but approachable
- Concise and actionable
- Knowledgeable about startup fundraising
- Proactive - take action when asked

## Important Notes
- You're speaking to startup founders who are actively fundraising
- When users ask you to add an investor, create a memo, etc. - USE YOUR TOOLS
- Always confirm what you're about to do before executing
- If you need more information to complete an action, ask for it`;

// Define the tools available to Circuit
const CIRCUIT_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_investor",
      description: "Add a new investor to the user's pipeline. Use this when the user asks to add an investor, track someone, or put someone in their pipeline.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The investor's full name"
          },
          email: {
            type: "string",
            description: "The investor's email address (optional)"
          },
          entity_name: {
            type: "string",
            description: "The name of the investor's fund or entity (optional)"
          },
          entity_type: {
            type: "string",
            enum: ["individual", "vc", "angel", "family_office", "corporate", "other"],
            description: "The type of investor entity (optional)"
          }
        },
        required: ["name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_investor_memo",
      description: "Create a personalized memo variant for a specific investor. Use this when the user wants to create a custom memo for an investor.",
      parameters: {
        type: "object",
        properties: {
          investor_name: {
            type: "string",
            description: "The name of the investor to create the memo for"
          }
        },
        required: ["investor_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_investor_docket",
      description: "Create a personalized docket/deal document for a specific investor. Use this when the user wants to create SAFE or deal docs for an investor.",
      parameters: {
        type: "object",
        properties: {
          investor_name: {
            type: "string",
            description: "The name of the investor to create the docket for"
          },
          amount: {
            type: "number",
            description: "The investment amount in dollars (optional)"
          }
        },
        required: ["investor_name"],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // SECURITY: Require authentication for this endpoint
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Circuit chat request with", messages.length, "messages, userId:", userId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: CIRCUIT_SYSTEM_PROMPT },
          ...messages,
        ],
        tools: CIRCUIT_TOOLS,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please check your plan." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process stream and save assistant response
    if (response.body) {
      // Create a transform stream with proper SSE line buffering
      let assistantContent = "";
      let toolCalls: any[] = [];
      let currentToolCall: { id?: string; name?: string; arguments?: string } = {};
      let sseBuffer = ""; // Buffer for incomplete SSE lines across chunks
      
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
          
          // Decode chunk and add to buffer
          sseBuffer += new TextDecoder().decode(chunk);
          
          // Process ONLY complete lines (ending with \n)
          let newlineIndex;
          while ((newlineIndex = sseBuffer.indexOf("\n")) !== -1) {
            let line = sseBuffer.slice(0, newlineIndex);
            sseBuffer = sseBuffer.slice(newlineIndex + 1);
            
            // Remove carriage return if present
            if (line.endsWith("\r")) {
              line = line.slice(0, -1);
            }
            
            // Skip empty lines and comments
            if (line.trim() === "" || line.startsWith(":")) {
              continue;
            }
            
            // Process data lines
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const delta = json.choices?.[0]?.delta;
                
                // Handle regular content
                if (delta?.content) {
                  assistantContent += delta.content;
                }
                
                // Handle tool calls
                if (delta?.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    if (toolCall.id) {
                      // New tool call starting - save previous if exists
                      if (currentToolCall.id) {
                        toolCalls.push({ ...currentToolCall });
                      }
                      currentToolCall = {
                        id: toolCall.id,
                        name: toolCall.function?.name || "",
                        arguments: toolCall.function?.arguments || ""
                      };
                    } else if (toolCall.function) {
                      // Continuing existing tool call
                      if (toolCall.function.name) {
                        currentToolCall.name = (currentToolCall.name || "") + toolCall.function.name;
                      }
                      if (toolCall.function.arguments) {
                        currentToolCall.arguments = (currentToolCall.arguments || "") + toolCall.function.arguments;
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Failed to parse SSE line:", line, e);
              }
            }
          }
          // Remaining incomplete line stays in sseBuffer for next chunk
        },
        async flush() {
          // Process any remaining content in buffer
          if (sseBuffer.trim()) {
            const line = sseBuffer.trim();
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const delta = json.choices?.[0]?.delta;
                if (delta?.content) {
                  assistantContent += delta.content;
                }
              } catch (e) {
                console.error("Failed to parse final SSE buffer:", line, e);
              }
            }
          }
          
          // Push the last tool call if exists
          if (currentToolCall.id) {
            toolCalls.push({ ...currentToolCall });
          }
          
          console.log("Stream complete. Content length:", assistantContent.length, "Tool calls:", toolCalls.length);
          
          // Prepare the content to save - include tool calls if any
          let contentToSave = assistantContent;
          if (toolCalls.length > 0) {
            // Embed tool calls as JSON in the message for the frontend to parse
            const toolCallsJson = JSON.stringify(toolCalls);
            contentToSave = `__TOOL_CALLS__${toolCallsJson}__END_TOOL_CALLS__${assistantContent}`;
          }
          
          // Save assistant message to database after stream completes
          if (assistantContent || toolCalls.length > 0) {
            try {
              const { error } = await supabase.from("circuit_chat_messages").insert({
                user_id: userId,
                role: "assistant",
                content: contentToSave,
              });
              if (error) {
                console.error("Failed to save assistant message:", error);
              } else {
                console.log("Saved assistant message to database, content length:", contentToSave.length, "tool_calls:", toolCalls.length);
              }
            } catch (e) {
              console.error("Failed to save assistant message:", e);
            }
          }
        },
      });

      const transformedStream = response.body.pipeThrough(transformStream);
      
      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Circuit chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
