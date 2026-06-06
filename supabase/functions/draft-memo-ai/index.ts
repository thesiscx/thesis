import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEMO_SECTIONS = [
  { key: 'vision', title: 'Vision', description: 'The big picture and long-term vision' },
  { key: 'problem', title: 'Problem', description: 'The problem being solved' },
  { key: 'solution', title: 'Solution', description: 'How the company solves the problem' },
  { key: 'product', title: 'Product', description: 'Product details and features' },
  { key: 'timing', title: 'Timing', description: 'Why now is the right time' },
  { key: 'market', title: 'Market', description: 'Market size and opportunity' },
  { key: 'competition', title: 'Competition', description: 'Competitive landscape' },
  { key: 'advantages', title: 'Advantages', description: 'Competitive advantages and moats' },
  { key: 'model', title: 'Model', description: 'Business model' },
  { key: 'economics', title: 'Economics', description: 'Unit economics and financials' },
  { key: 'distribution', title: 'Distribution', description: 'Go-to-market and distribution strategy' },
  { key: 'traction', title: 'Traction', description: 'Current traction and metrics' },
  { key: 'team', title: 'Team', description: 'Team background and expertise' },
  { key: 'funding', title: 'Funding', description: 'Funding history and current round' },
  { key: 'roadmap', title: 'Roadmap', description: 'Future plans and milestones' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { draftData, editMode, editPrompt, currentContent } = body;
    const AI_API_KEY = Deno.env.get('AI_API_KEY');
    const AI_BASE_URL = Deno.env.get('AI_BASE_URL') ?? 'https://api.openai.com/v1';
    const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini';

    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (editMode && editPrompt && currentContent) {
      // Edit mode - modify existing memo based on user instructions
      console.log('Edit mode: modifying existing memo');
      
      systemPrompt = `You are an expert investment memo editor. You help founders refine and improve their investor memos.

Your task is to modify an existing investor memo based on the founder's specific instructions.

IMPORTANT FORMATTING RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanation
2. The JSON must be a TipTap document structure exactly like the input
3. Make only the changes requested by the user
4. Preserve the overall structure and sections of the memo
5. Maintain a confident, professional tone appropriate for sophisticated investors
6. Keep content that wasn't mentioned in the edit request

Return the modified memo as a TipTap JSON document with this exact structure:
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Section Title" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Section content..." }] }
  ]
}`;

      userPrompt = `Here is the current memo content:

${JSON.stringify(currentContent, null, 2)}

User's edit request:
${editPrompt}

Apply the requested changes to the memo while preserving its overall structure. Return the complete updated memo as a TipTap JSON document.`;
    } else {
      // Draft mode - create new memo from scratch
      console.log('Draft mode: creating new memo');
      
      systemPrompt = `You are an expert investment memo writer. You help founders create compelling, professional investor memos.

Your task is to generate a complete investor memo with 15 sections based on the information provided by the founder.

IMPORTANT FORMATTING RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanation
2. The JSON must be a TipTap document structure
3. Each section MUST have an H1 heading (level 1) followed by 2-4 paragraphs of professional content
4. CRITICAL: Use heading level 1 (NOT level 2) for ALL section headings
5. Write in a confident, professional tone appropriate for sophisticated investors
6. Use specific details from the provided information
7. Where information is missing, write compelling placeholder content that the founder can edit
8. Each paragraph should be substantive (3-5 sentences minimum)

The 15 sections are: Vision, Problem, Solution, Product, Timing, Market, Competition, Advantages, Model, Economics, Distribution, Traction, Team, Funding, Roadmap.

Return the memo as a TipTap JSON document with this exact structure:
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Section Title" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Section content..." }] }
  ]
}`;

      userPrompt = `Generate a complete investor memo for the following company:

Company Name: ${draftData?.companyName || 'Company'}
One-Liner: ${draftData?.oneLiner || 'Not provided'}
Founded: ${draftData?.founded || 'Not specified'}
Round Type: ${draftData?.roundType || 'Seed'}
Target Raise: ${draftData?.targetRaise ? `$${Number(draftData.targetRaise).toLocaleString()}` : 'Not specified'}

Problem Statement:
${draftData?.problem || 'The founder will provide the problem statement.'}

Solution:
${draftData?.solution || 'The founder will provide the solution details.'}

Total Addressable Market (TAM):
${draftData?.tam || 'Not specified'}

Market Insight (Why Now):
${draftData?.marketInsight || 'The founder will provide timing insights.'}

Revenue Model:
${draftData?.revenueModel || 'Not specified'}

Pricing:
${draftData?.pricing || 'Not specified'}

Key Metrics & Traction:
${draftData?.keyMetrics || 'The founder will provide traction metrics.'}

Founding Team:
${draftData?.founders || 'The founder will provide team details.'}

Use of Funds:
${draftData?.useOfFunds || 'The founder will provide use of funds.'}

Generate a professional, compelling investor memo with all 15 sections. Use the specific details provided, and where information is not given, write compelling placeholder content that guides the founder on what to add.`;
    }

    console.log('Calling AI provider...');

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content returned from AI');
    }

    console.log('AI response received, parsing...');
    
    // Try to parse the JSON from the AI response
    let memoContent;
    try {
      // Remove any markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      memoContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI content:', aiContent.substring(0, 500));
      
      // For edit mode, return the original content on parse failure
      if (editMode && currentContent) {
        console.log('Edit mode parse failure - returning original content');
        return new Response(JSON.stringify({ 
          content: currentContent,
          error: 'Failed to parse AI response, original content preserved'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Fallback: generate a basic structure with the AI text as content
      memoContent = {
        type: 'doc',
        content: MEMO_SECTIONS.flatMap(section => [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: section.title }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `Content for ${section.title} section. Please edit this section with your specific details.` }]
          }
        ])
      };
    }

    console.log('Memo content generated successfully');

    return new Response(JSON.stringify({ content: memoContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in draft-memo-ai function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
