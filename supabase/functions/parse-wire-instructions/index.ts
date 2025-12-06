import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, roundId } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "File URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the PDF content
    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to fetch PDF");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Use Gemini to parse the wire instructions
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting wire transfer instructions from documents. 
Extract the following fields if present:
- bankName: The name of the bank
- accountName: The name on the account (beneficiary name)
- accountNumber: The account number
- routingNumber: The ABA routing number (9 digits for US banks)
- swiftCode: The SWIFT/BIC code for international transfers
- bankAddress: The physical address of the bank
- reference: Any reference or memo instructions

Return ONLY a valid JSON object with these fields. Use null for any field not found.
Example: {"bankName": "Chase Bank", "accountNumber": "123456789", "routingNumber": "021000021", "swiftCode": null, "bankAddress": "123 Main St, NY", "accountName": "Acme Inc", "reference": "Investment"}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract wire transfer instructions from this document. Return only a JSON object with the fields."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to parse document with AI");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", content);

    // Try to extract JSON from the response
    let wireInstructions = null;
    try {
      // Look for JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        wireInstructions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        wireInstructions,
        rawResponse: content 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error parsing wire instructions:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to parse wire instructions";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        wireInstructions: null 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
