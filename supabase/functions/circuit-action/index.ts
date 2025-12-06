import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Circuit action:", action, "for user:", user.id, "params:", params);

    let result: any = null;

    switch (action) {
      case "add_investor": {
        // Generate a slug from the name
        const slug = params.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Check if investor with this slug already exists
        const { data: existing } = await supabase
          .from("investors")
          .select("id, slug")
          .eq("workspace_id", user.id)
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ 
            error: `Investor "${params.name}" already exists in your pipeline`,
            existing: true
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: investor, error: insertError } = await supabase
          .from("investors")
          .insert({
            workspace_id: user.id,
            name: params.name,
            slug,
            email: params.email || null,
            entity_name: params.entity_name || null,
            entity_type: params.entity_type || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        result = { 
          success: true, 
          message: `Added ${params.name} to your pipeline`,
          investor 
        };
        break;
      }

      case "create_investor_memo": {
        // Find the investor
        const investorSlug = params.investor_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const { data: investor } = await supabase
          .from("investors")
          .select("id, name")
          .eq("workspace_id", user.id)
          .or(`slug.eq.${investorSlug},name.ilike.%${params.investor_name}%`)
          .maybeSingle();

        if (!investor) {
          return new Response(JSON.stringify({ 
            error: `Could not find investor "${params.investor_name}" in your pipeline. Add them first!`
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get the open round
        const { data: round } = await supabase
          .from("rounds")
          .select("id")
          .eq("created_by", user.id)
          .eq("state", "open")
          .maybeSingle();

        if (!round) {
          return new Response(JSON.stringify({ 
            error: "You need an open round to create investor memos"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if memo already exists
        const { data: existingMemo } = await supabase
          .from("memos")
          .select("id")
          .eq("round_id", round.id)
          .eq("investor_id", investor.id)
          .maybeSingle();

        if (existingMemo) {
          return new Response(JSON.stringify({ 
            error: `A memo for ${investor.name} already exists`,
            existing: true
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get global memo content to copy
        const { data: globalMemo } = await supabase
          .from("memos")
          .select("content")
          .eq("round_id", round.id)
          .eq("is_global", true)
          .maybeSingle();

        // Create the investor-specific memo
        const { data: memo, error: memoError } = await supabase
          .from("memos")
          .insert({
            round_id: round.id,
            investor_id: investor.id,
            is_global: false,
            created_by: user.id,
            content: globalMemo?.content || {},
          })
          .select()
          .single();

        if (memoError) throw memoError;

        result = {
          success: true,
          message: `Created personalized memo for ${investor.name}`,
          memo
        };
        break;
      }

      case "create_investor_docket": {
        // Find the investor
        const investorSlug = params.investor_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const { data: investor } = await supabase
          .from("investors")
          .select("id, name")
          .eq("workspace_id", user.id)
          .or(`slug.eq.${investorSlug},name.ilike.%${params.investor_name}%`)
          .maybeSingle();

        if (!investor) {
          return new Response(JSON.stringify({ 
            error: `Could not find investor "${params.investor_name}" in your pipeline. Add them first!`
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get the open round
        const { data: round } = await supabase
          .from("rounds")
          .select("id")
          .eq("created_by", user.id)
          .eq("state", "open")
          .maybeSingle();

        if (!round) {
          return new Response(JSON.stringify({ 
            error: "You need an open round to create investor dockets"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if docket already exists
        const { data: existingDocket } = await supabase
          .from("dockets")
          .select("id")
          .eq("round_id", round.id)
          .eq("investor_id", investor.id)
          .maybeSingle();

        if (existingDocket) {
          return new Response(JSON.stringify({ 
            error: `A docket for ${investor.name} already exists`,
            existing: true
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create the investor-specific docket
        const { data: docket, error: docketError } = await supabase
          .from("dockets")
          .insert({
            round_id: round.id,
            investor_id: investor.id,
            is_global: false,
            created_by: user.id,
            amount: params.amount || null,
          })
          .select()
          .single();

        if (docketError) throw docketError;

        result = {
          success: true,
          message: `Created docket for ${investor.name}${params.amount ? ` ($${params.amount.toLocaleString()})` : ''}`,
          docket
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Circuit action error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
