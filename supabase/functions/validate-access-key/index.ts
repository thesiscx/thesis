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

    // Validate access key format
    const keyRegex = /^robo-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
    if (!keyRegex.test(key)) {
      return new Response(
        JSON.stringify({ error: 'Invalid access key format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up access key
    const { data: accessKey, error: keyError } = await supabase
      .from('access_keys')
      .select('*, stakeholder:stakeholders(*)')
      .eq('key', key)
      .single();

    if (keyError || !accessKey) {
      console.log('Key lookup error:', keyError);
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

    // Update last_used_at
    await supabase
      .from('access_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', accessKey.id);

    // Log access
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase
      .from('access_logs')
      .insert({
        stakeholder_id: accessKey.stakeholder_id,
        access_key_id: accessKey.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: 'login'
      });

    console.log(`Access granted for stakeholder: ${accessKey.stakeholder.name}`);

    return new Response(
      JSON.stringify({
        valid: true,
        stakeholder: {
          id: accessKey.stakeholder.id,
          name: accessKey.stakeholder.name,
          organization: accessKey.stakeholder.organization
        },
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