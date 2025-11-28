import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateKeyRequest {
  stakeholderId: string;
  expiresAt?: string;
}

function generateAccessKey(shortCode: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const generateSegment = () => {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    return segment;
  };
  
  return `robo-${shortCode}-${generateSegment()}-${generateSegment()}`;
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

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { stakeholderId, expiresAt }: GenerateKeyRequest = await req.json();

    if (!stakeholderId) {
      return new Response(
        JSON.stringify({ error: 'Stakeholder ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get stakeholder to retrieve short_code
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('short_code')
      .eq('id', stakeholderId)
      .single();

    if (stakeholderError || !stakeholder) {
      return new Response(
        JSON.stringify({ error: 'Stakeholder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stakeholder.short_code) {
      return new Response(
        JSON.stringify({ error: 'Stakeholder must have a short code before generating access key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique key
    let key = generateAccessKey(stakeholder.short_code);
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('access_keys')
        .select('id')
        .eq('key', key)
        .single();

      if (!existing) break;
      
      key = generateAccessKey(stakeholder.short_code);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create access key
    const { data: newKey, error: insertError } = await supabase
      .from('access_keys')
      .insert({
        key,
        stakeholder_id: stakeholderId,
        status: 'active',
        expires_at: expiresAt || null,
        created_by: user.id
      })
      .select('*, stakeholder:stakeholders(*)')
      .single();

    if (insertError) {
      console.error('Error creating access key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create access key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated access key for stakeholder: ${newKey.stakeholder.name}`);

    return new Response(
      JSON.stringify({
        key: newKey.key,
        stakeholder: newKey.stakeholder,
        expiresAt: newKey.expires_at
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