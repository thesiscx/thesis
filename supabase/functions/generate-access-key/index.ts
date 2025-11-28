import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateKeyRequest {
  investorId?: string | null;
  roundId: string;
  tool: 'memo' | 'docket';
}

function generateAccessKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const generateSegment = () => {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    return segment;
  };
  
  return `${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[generate-access-key] Starting request...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[generate-access-key] Missing auth header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    console.log(`[generate-access-key] Auth check starting... (${Date.now() - startTime}ms)`);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log(`[generate-access-key] Auth check complete (${Date.now() - startTime}ms)`);
    
    if (userError || !user) {
      console.log('[generate-access-key] Unauthorized:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { investorId, roundId, tool }: GenerateKeyRequest = await req.json();
    console.log(`[generate-access-key] Request params: roundId=${roundId}, tool=${tool}, investorId=${investorId || 'null'}`);

    if (!roundId || !tool) {
      return new Response(
        JSON.stringify({ error: 'roundId and tool are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['memo', 'docket'].includes(tool)) {
      return new Response(
        JSON.stringify({ error: 'Tool must be "memo" or "docket"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the round
    console.log(`[generate-access-key] Verifying round ownership... (${Date.now() - startTime}ms)`);
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('id, workspace_id, created_by')
      .eq('id', roundId)
      .eq('created_by', user.id)
      .single();
    console.log(`[generate-access-key] Round verification complete (${Date.now() - startTime}ms)`);

    if (roundError || !round) {
      console.log('[generate-access-key] Round not found or access denied:', roundError?.message);
      return new Response(
        JSON.stringify({ error: 'Round not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let investor = null;

    // If investorId provided, verify investor belongs to this workspace
    if (investorId) {
      console.log(`[generate-access-key] Verifying investor... (${Date.now() - startTime}ms)`);
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id, name, slug')
        .eq('id', investorId)
        .eq('workspace_id', round.workspace_id)
        .single();
      console.log(`[generate-access-key] Investor verification complete (${Date.now() - startTime}ms)`);

      if (investorError || !investorData) {
        console.log('[generate-access-key] Investor not found:', investorError?.message);
        return new Response(
          JSON.stringify({ error: 'Investor not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      investor = investorData;
    }

    // Check if key already exists for this investor/round/tool combo (or global if no investor)
    console.log(`[generate-access-key] Checking existing keys... (${Date.now() - startTime}ms)`);
    let existingKeyQuery = supabase
      .from('access_keys')
      .select('*')
      .eq('round_id', roundId)
      .eq('tool', tool);

    if (investorId) {
      existingKeyQuery = existingKeyQuery.eq('investor_id', investorId);
    } else {
      existingKeyQuery = existingKeyQuery.is('investor_id', null);
    }

    const { data: existingKey } = await existingKeyQuery.maybeSingle();
    console.log(`[generate-access-key] Existing key check complete (${Date.now() - startTime}ms)`);

    if (existingKey) {
      console.log(`[generate-access-key] Returning existing key (${Date.now() - startTime}ms total)`);
      return new Response(
        JSON.stringify({
          id: existingKey.id,
          key: existingKey.key,
          investor: investor,
          isExisting: true,
          isGlobal: !investorId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique key
    console.log(`[generate-access-key] Generating new key... (${Date.now() - startTime}ms)`);
    let key = generateAccessKey();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('access_keys')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (!existing) break;
      
      key = generateAccessKey();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('[generate-access-key] Failed to generate unique key after max attempts');
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[generate-access-key] Key generated in ${attempts} attempts (${Date.now() - startTime}ms)`);

    // Create access key using service role to bypass RLS
    console.log(`[generate-access-key] Inserting key... (${Date.now() - startTime}ms)`);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newKey, error: insertError } = await supabaseAdmin
      .from('access_keys')
      .insert({
        key,
        investor_id: investorId || null,
        round_id: roundId,
        tool,
        workspace_id: round.workspace_id,
        status: 'active',
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-access-key] Error creating access key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create access key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If this is a memo key, also create a share_link for RLS access
    if (tool === 'memo') {
      console.log(`[generate-access-key] Creating share_link for memo... (${Date.now() - startTime}ms)`);
      
      // Find the memo for this round/investor
      let memoQuery = supabaseAdmin
        .from('memos')
        .select('id')
        .eq('round_id', roundId);
      
      if (investorId) {
        memoQuery = memoQuery.eq('investor_id', investorId);
      } else {
        memoQuery = memoQuery.eq('is_global', true);
      }
      
      const { data: memo } = await memoQuery.maybeSingle();
      
      if (memo) {
        // Generate a token for the share link (use the access key as token for simplicity)
        const { error: shareLinkError } = await supabaseAdmin
          .from('share_links')
          .upsert({
            memo_id: memo.id,
            token: key,
            permissions: 'view',
            created_by: user.id
          }, {
            onConflict: 'token'
          });
        
        if (shareLinkError) {
          console.error('[generate-access-key] Error creating share_link:', shareLinkError);
          // Don't fail the whole request, access key was still created
        } else {
          console.log(`[generate-access-key] Share link created for memo ${memo.id}`);
        }
      } else {
        console.log('[generate-access-key] No memo found for this round/investor, skipping share_link');
      }
    }

    console.log(`[generate-access-key] SUCCESS - Generated ${investorId ? 'investor' : 'global'} key for round: ${roundId}, tool: ${tool} (${Date.now() - startTime}ms total)`);

    return new Response(
      JSON.stringify({
        id: newKey.id,
        key: newKey.key,
        investor: investor,
        isExisting: false,
        isGlobal: !investorId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[generate-access-key] Error after ${Date.now() - startTime}ms:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
