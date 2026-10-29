// ============================================================
//  Edge Function: checkout
//  Cria a sessão de pagamento (Stripe ou Mercado Pago).
//  Deploy: supabase functions deploy checkout
//  Secrets: supabase secrets set STRIPE_SECRET_KEY=... APP_URL=https://seu-site.netlify.app
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  plan?: 'pro' | 'studio';
  interval?: 'month' | 'year';
  email?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { plan = 'pro', interval = 'month', email } = (await req.json()) as Body;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: 'STRIPE_SECRET_KEY não configurada',
          hint: 'Rode: supabase secrets set STRIPE_SECRET_KEY=sk_live_... APP_URL=https://seu-site.netlify.app',
        }),
        { status: 501, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Preços: crie no Stripe Dashboard e cole os price_id aqui (ou use env)
    const PRICES: Record<string, string> = {
      'pro:month': Deno.env.get('PRICE_PRO_MONTH') ?? '',
      'pro:year': Deno.env.get('PRICE_PRO_YEAR') ?? '',
      'studio:month': Deno.env.get('PRICE_STUDIO_MONTH') ?? '',
    };
    const priceId = PRICES[`${plan}:${interval}`];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `price_id ausente para ${plan}/${interval}` }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', `${appUrl}/?checkout=success`);
    params.set('cancel_url', `${appUrl}/?checkout=cancel`);
    if (email) params.set('customer_email', email);
    params.set('allow_promotion_codes', 'true');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? 'Falha ao criar checkout');

    return new Response(JSON.stringify({ url: data.url, id: data.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
