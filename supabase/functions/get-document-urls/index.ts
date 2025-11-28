import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { accessKey } = await req.json();

    // 1. Validate the access key format
    const keyRegex = /^robo-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
    if (!accessKey || !keyRegex.test(accessKey)) {
      console.log('Invalid access key format:', accessKey);
      return new Response(
        JSON.stringify({ error: 'Invalid access key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate against database
    const { data: keyData, error: keyError } = await supabase
      .from('access_keys')
      .select('id, status, expires_at, stakeholder_id')
      .eq('key', accessKey)
      .single();

    if (keyError || !keyData) {
      console.log('Access key not found:', keyError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid access key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (keyData.status !== 'active') {
      console.log('Access key inactive:', keyData.status);
      return new Response(
        JSON.stringify({ error: 'Access key is not active' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      console.log('Access key expired:', keyData.expires_at);
      return new Response(
        JSON.stringify({ error: 'Access key expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. List files in documents bucket
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list('', { limit: 100 });

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    const validFiles = (files || []).filter(f => f.name && !f.name.startsWith('.'));
    console.log(`Found ${validFiles.length} valid files`);

    if (validFiles.length === 0) {
      return new Response(
        JSON.stringify({ files: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Generate signed URLs (valid for 60 seconds)
    const signedUrls = await Promise.all(
      validFiles.map(async (file) => {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(file.name, 60);
        
        if (error) {
          console.error(`Error creating signed URL for ${file.name}:`, error);
        }
        
        return {
          name: file.name,
          url: data?.signedUrl || null,
          error: error?.message || null
        };
      })
    );

    const successfulUrls = signedUrls.filter(f => f.url);
    console.log(`Generated ${successfulUrls.length} signed URLs`);

    // 5. Log the download access
    await supabase.from('access_logs').insert({
      stakeholder_id: keyData.stakeholder_id,
      access_key_id: keyData.id,
      action: 'download_documents'
    });

    return new Response(
      JSON.stringify({ files: successfulUrls }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-document-urls:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
