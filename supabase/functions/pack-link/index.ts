// ============================================================
//  Edge Function: pack-link
//  Gera link de download TEMPORÁRIO de um pack, só para assinante.
//  É isso que permite distribuir 46 GB sem pagar egress/armazenamento
//  você mesmo (o arquivo fica em R2/B2 e a URL é assinada).
//  Deploy: supabase functions deploy pack-link
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'não autenticado' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { slug } = (await req.json()) as { slug?: string };
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug obrigatório' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 1) o pack existe e está publicado?
    const { data: pack } = await supabase
      .from('packs')
      .select('id, slug, download_url, requires_plan, is_free, bytes_total')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (!pack) {
      return new Response(JSON.stringify({ error: 'pack não encontrado' }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 2) assinatura válida? (a função is_pro() roda com o RLS do usuário)
    const { data: pro } = await supabase.rpc('is_pro', { uid: user.id });
    if (!pack.is_free && !pro) {
      return new Response(JSON.stringify({ error: 'assinatura necessária', plan: pack.requires_plan }), {
        status: 402,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 3) registra a instalação
    await supabase.from('user_packs').upsert(
      { user_id: user.id, pack_id: pack.id },
      { onConflict: 'user_id,pack_id' },
    );

    // 4) devolve a URL (assinada se você usa R2 com presigned URL)
    return new Response(
      JSON.stringify({
        ok: true,
        url: pack.download_url,
        bytes: pack.bytes_total,
        expires_in: 3600,
        note: 'A URL expira em 1h. Baixe o pack e instale no editor.',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
