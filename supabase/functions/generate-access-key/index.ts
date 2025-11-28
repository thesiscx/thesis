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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { investorId, roundId, tool }: GenerateKeyRequest = await req.json();

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
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('id, workspace_id, created_by')
      .eq('id', roundId)
      .eq('created_by', user.id)
      .single();

    if (roundError || !round) {
      return new Response(
        JSON.stringify({ error: 'Round not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let investor = null;

    // If investorId provided, verify investor belongs to this workspace
    if (investorId) {
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id, name, slug')
        .eq('id', investorId)
        .eq('workspace_id', round.workspace_id)
        .single();

      if (investorError || !investorData) {
        return new Response(
          JSON.stringify({ error: 'Investor not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      investor = investorData;
    }

    // Check if key already exists for this investor/round/tool combo (or global if no investor)
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

    if (existingKey) {
      // Return existing key
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
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create access key using service role to bypass RLS
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
      console.error('Error creating access key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create access key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${investorId ? 'investor' : 'global'} access key for round: ${roundId}, tool: ${tool}`);

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
    console.error('Error generating access key:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
