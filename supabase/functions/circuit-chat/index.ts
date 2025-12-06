import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

## Your Role
- Help founders understand and use Circuit effectively
- Assist with fundraising strategy and best practices
- Help draft memo content and pitch materials
- Answer questions about SAFEs, convertible notes, and deal terms
- Provide guidance on investor communications

## Tone & Style
- Professional but approachable
- Concise and actionable
- Knowledgeable about startup fundraising
- Encouraging but realistic

## Important Notes
- You're speaking to startup founders who are actively fundraising
- Keep responses focused and practical
- If asked about features that don't exist, suggest they're on the roadmap
- Never pretend to have access to their actual data - you're a helpful advisor`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Circuit chat request with", messages.length, "messages");

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
