import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateKeyRequest {
  key: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { key }: ValidateKeyRequest = await req.json();

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'Access key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate access key format: xxxx-xxxx-xxxx-xxxx (all lowercase alpha)
    const keyRegex = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/;
    if (!keyRegex.test(key.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid access key format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up access key with investor and round info
    const { data: accessKey, error: keyError } = await supabase
      .from('access_keys')
      .select(`
        *,
        investor:investors(*),
        round:rounds(*)
      `)
      .eq('key', key.toLowerCase())
      .maybeSingle();

    console.log('Key lookup result:', { accessKey, keyError, searchKey: key.toLowerCase() });

    if (keyError) {
      console.error('Key lookup error:', keyError);
      return new Response(
        JSON.stringify({ error: 'Error looking up key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accessKey) {
      console.log('No access key found for:', key.toLowerCase());
      return new Response(
        JSON.stringify({ error: 'Invalid access key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key is active
    if (accessKey.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Access key is inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key is expired
    if (accessKey.expires_at && new Date(accessKey.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Access key has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the profile for company info
    let companySlug = null;
    let companyName = null;
    
    if (accessKey.round?.created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_slug, company_name')
        .eq('id', accessKey.round.created_by)
        .maybeSingle();
      
      if (profile) {
        companySlug = profile.company_slug;
        companyName = profile.company_name;
      }
    }

    // Update last_used_at
    await supabase
      .from('access_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', accessKey.id);

    // Log access using SECURITY DEFINER function (prevents direct table manipulation)
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase.rpc('insert_access_log', {
      p_access_key_id: accessKey.id,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_action: 'investor_access'
    });

    // Calculate public round code
    const roundCode = accessKey.round?.round_number > 1 
      ? `${accessKey.round.round_type}${accessKey.round.round_number}`
      : accessKey.round?.round_type;

    console.log(`Access granted for investor: ${accessKey.investor?.name}, tool: ${accessKey.tool}`);

    return new Response(
      JSON.stringify({
        valid: true,
        investor: {
          id: accessKey.investor?.id,
          name: accessKey.investor?.name,
          slug: accessKey.investor?.slug
        },
        round: {
          id: accessKey.round?.id,
          name: accessKey.round?.name,
          roundCode,
          roundType: accessKey.round?.round_type,
          roundNumber: accessKey.round?.round_number
        },
        workspace: {
          companySlug,
          companyName
        },
        tool: accessKey.tool,
        accessKeyId: accessKey.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating access key:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
